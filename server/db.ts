import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { accountProfiles, auditEvents, InsertUser, users, workspaceApplications, workspaceMemberships } from "../drizzle/schema";
import { canEditWorkspaceApplication, canReviewWorkspaceApplication, resolveWorkspaceAvailability, type WorkspaceApplicationInput, type WorkspaceApplicationStatus, type WorkspaceApplicationType, type WorkspaceAvailabilityStatus, type WorkspaceType } from "../shared/workspace";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type WorkspaceSummary = {
  workspaceType: WorkspaceType;
  status: WorkspaceAvailabilityStatus;
  applicationId: number | null;
  displayName: string | null;
  businessType: "restaurant" | "cloud_kitchen" | null;
  reviewNote: string | null;
};

async function getRequiredDb() {
  const db = await getDb();
  if (!db) throw new Error("Database service is unavailable.");
  return db;
}

async function ensureCustomerWorkspace(userId: number) {
  const db = await getRequiredDb();
  const existing = await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceType, "customer"))).limit(1);
  if (existing.length === 0) {
    await db.insert(workspaceMemberships).values({ userId, workspaceType: "customer", status: "active", approvedAt: new Date() });
    await db.insert(auditEvents).values({ actorUserId: userId, entityType: "workspace_membership", entityId: `${userId}:customer`, action: "customer_workspace_created" });
  }
}

export async function getWorkspaceSummaries(userId: number): Promise<WorkspaceSummary[]> {
  await ensureCustomerWorkspace(userId);
  const db = await getRequiredDb();
  const [memberships, applications] = await Promise.all([
    db.select().from(workspaceMemberships).where(eq(workspaceMemberships.userId, userId)),
    db.select().from(workspaceApplications).where(eq(workspaceApplications.userId, userId)),
  ]);

  const membershipFor = (workspaceType: WorkspaceType) => memberships.find((membership) => membership.workspaceType === workspaceType);
  const applicationFor = (workspaceType: WorkspaceApplicationType) => applications.find((application) => application.workspaceType === workspaceType);

  return ["customer", "business", "rider"].map((workspaceType) => {
    const membership = membershipFor(workspaceType as WorkspaceType);
    const application = workspaceType === "customer" ? undefined : applicationFor(workspaceType as WorkspaceApplicationType);
    return {
      workspaceType: workspaceType as WorkspaceType,
      status: resolveWorkspaceAvailability(membership?.status, application?.status),
      applicationId: application?.id ?? membership?.applicationId ?? null,
      displayName: application?.displayName ?? null,
      businessType: application?.businessType ?? null,
      reviewNote: application?.reviewNote ?? null,
    };
  });
}

export async function saveWorkspaceApplication(userId: number, input: WorkspaceApplicationInput, submit: boolean) {
  const db = await getRequiredDb();
  const existingRows = await db.select().from(workspaceApplications).where(and(eq(workspaceApplications.userId, userId), eq(workspaceApplications.workspaceType, input.workspaceType))).limit(1);
  const existing = existingRows[0];

  if (existing && !canEditWorkspaceApplication(existing.status)) {
    throw new Error("This workspace application is under review or already finalised.");
  }

  const nextStatus: WorkspaceApplicationStatus = submit ? "submitted" : "draft";
  const now = new Date();
  const values = {
    workspaceType: input.workspaceType,
    businessType: input.workspaceType === "business" ? input.businessType ?? null : null,
    displayName: input.displayName?.trim() || null,
    phoneE164: input.phoneE164 ?? null,
    city: input.city?.trim() || null,
    status: nextStatus,
    submittedAt: submit ? now : null,
    reviewNote: null,
  } as const;

  if (existing) {
    await db.update(workspaceApplications).set(values).where(eq(workspaceApplications.id, existing.id));
    await db.insert(auditEvents).values({ actorUserId: userId, entityType: "workspace_application", entityId: String(existing.id), action: submit ? "application_submitted" : "application_saved", previousValue: JSON.stringify({ status: existing.status }), nextValue: JSON.stringify({ status: nextStatus }) });
    return existing.id;
  }

  await db.insert(workspaceApplications).values({ userId, ...values });
  const createdRows = await db.select().from(workspaceApplications).where(and(eq(workspaceApplications.userId, userId), eq(workspaceApplications.workspaceType, input.workspaceType))).limit(1);
  const applicationId = createdRows[0]?.id;
  if (!applicationId) throw new Error("Workspace application could not be created.");
  await db.insert(auditEvents).values({ actorUserId: userId, entityType: "workspace_application", entityId: String(applicationId), action: submit ? "application_submitted" : "application_saved", nextValue: JSON.stringify({ status: nextStatus }) });
  return applicationId;
}

export async function reviewWorkspaceApplication(reviewerUserId: number, applicationId: number, nextStatus: Extract<WorkspaceApplicationStatus, "changes_required" | "approved" | "suspended">, reviewNote?: string) {
  const db = await getRequiredDb();
  const applicationRows = await db.select().from(workspaceApplications).where(eq(workspaceApplications.id, applicationId)).limit(1);
  const application = applicationRows[0];
  if (!application) throw new Error("Workspace application not found.");
  if (!canReviewWorkspaceApplication(application.status, nextStatus)) throw new Error("This application cannot move to the requested review state.");

  await db.transaction(async (tx) => {
    const now = new Date();
    await tx.update(workspaceApplications).set({ status: nextStatus, reviewNote: reviewNote?.trim() || null, reviewedAt: now, reviewedByUserId: reviewerUserId }).where(eq(workspaceApplications.id, applicationId));
    if (nextStatus === "approved") {
      await tx.insert(workspaceMemberships).values({ userId: application.userId, workspaceType: application.workspaceType, status: "active", applicationId, approvedAt: now }).onDuplicateKeyUpdate({ set: { status: "active", applicationId, approvedAt: now, suspendedAt: null, suspensionReason: null, updatedAt: now } });
    }
    await tx.insert(auditEvents).values({ actorUserId: reviewerUserId, entityType: "workspace_application", entityId: String(applicationId), action: `application_${nextStatus}`, previousValue: JSON.stringify({ status: application.status }), nextValue: JSON.stringify({ status: nextStatus, reviewNote: reviewNote?.trim() || null }) });
  });
}

export async function updateAccountProfile(userId: number, input: { givenName?: string; phoneE164?: string; phoneVerified?: boolean; defaultCity?: string }) {
  const db = await getRequiredDb();
  const profileValues = {
    givenName: input.givenName?.trim() || null,
    phoneE164: input.phoneE164 ?? null,
    phoneVerifiedAt: input.phoneVerified ? new Date() : null,
    defaultCity: input.defaultCity?.trim() || null,
  } as const;
  await db.insert(accountProfiles).values({ userId, ...profileValues }).onDuplicateKeyUpdate({ set: { ...profileValues, updatedAt: new Date() } });
}
