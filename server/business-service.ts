import { and, eq } from "drizzle-orm";

import {
  auditEvents,
  businessApplicationDetails,
  businessDocuments,
  businessHours,
  businessOrganisations,
  businessOutlets,
  businessReviewChecklists,
  businessStaffMemberships,
  cloudKitchens,
  kitchenBrands,
  menuCategories,
  menuItems,
  productionStations,
  serviceZones,
  workspaceApplications,
  workspaceMemberships,
} from "../drizzle/schema";
import {
  BUSINESS_DOCUMENT_TYPES,
  requiredChecklistForBusinessType,
  type BusinessApplicationDraft,
  type BusinessDocumentType,
  validateBusinessApplicationDraft,
} from "../shared/business";
import { storagePut } from "./storage";
import { getDb } from "./db";

type ApplicationReviewStatus = "changes_required" | "approved" | "suspended";
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Business services are temporarily unavailable.");
  return db;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function normaliseDraft(draft: BusinessApplicationDraft): BusinessApplicationDraft {
  return {
    ...draft,
    legalName: draft.legalName.trim(), displayName: draft.displayName.trim(), supportPhone: draft.supportPhone.trim(), city: draft.city.trim(), addressLine1: draft.addressLine1.trim(), description: draft.description?.trim() || undefined, pickupInstructions: draft.pickupInstructions?.trim() || undefined,
    restaurant: draft.restaurant ? { cuisine: draft.restaurant.cuisine.trim() } : undefined,
    cloudKitchen: draft.cloudKitchen ? { ...draft.cloudKitchen, kitchenName: draft.cloudKitchen.kitchenName.trim(), brands: draft.cloudKitchen.brands.map((brand) => ({ ...brand, name: brand.name.trim(), cuisine: brand.cuisine.trim(), description: brand.description?.trim() || undefined })), stations: draft.cloudKitchen.stations.map((station) => ({ ...station, name: station.name.trim() })) } : undefined,
  };
}

async function ownedBusinessApplication(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(workspaceApplications).where(and(eq(workspaceApplications.userId, userId), eq(workspaceApplications.workspaceType, "business"))).limit(1);
  return rows[0];
}

export async function getMyBusinessApplication(userId: number) {
  const db = await requireDb();
  const application = await ownedBusinessApplication(userId);
  if (!application) return null;
  const [detailRows, documentRows, checklistRows] = await Promise.all([
    db.select().from(businessApplicationDetails).where(eq(businessApplicationDetails.applicationId, application.id)).limit(1),
    db.select().from(businessDocuments).where(eq(businessDocuments.applicationId, application.id)),
    db.select().from(businessReviewChecklists).where(eq(businessReviewChecklists.applicationId, application.id)),
  ]);
  const detail = detailRows[0];
  return {
    application,
    detail: detail ? {
      legalName: detail.legalName ?? "", displayName: detail.displayName ?? "", supportPhone: detail.supportPhone ?? "", city: detail.city ?? "", addressLine1: detail.addressLine1 ?? "", description: detail.description ?? "", pickupInstructions: detail.pickupInstructions ?? "", prepTimeMinutes: detail.prepTimeMinutes ?? 25, openingTime: detail.openingTime ?? "09:00", closingTime: detail.closingTime ?? "23:00", serviceZone: parseJson(detail.serviceZonePayload, { name: detail.city ? `${detail.city} core` : "", deliveryFeeMinor: 0, minimumOrderMinor: 0 }), menu: parseJson(detail.menuPayload, []), businessType: application.businessType!, restaurant: application.businessType === "restaurant" ? { cuisine: detail.cuisine ?? "" } : undefined, cloudKitchen: application.businessType === "cloud_kitchen" ? parseJson(detail.cloudKitchenPayload, { kitchenName: "", capacityLimit: 10, brands: [], stations: [] }) : undefined,
    } : null,
    documents: documentRows,
    checklist: checklistRows,
  };
}

export async function saveBusinessDraft(userId: number, draftInput: BusinessApplicationDraft, submit: boolean) {
  const db = await requireDb();
  const draft = normaliseDraft(draftInput);
  let application = await ownedBusinessApplication(userId);
  if (application && !["draft", "changes_required"].includes(application.status)) throw new Error("This Business application is currently under review and cannot be changed.");
  const now = new Date();
  const applicationValues = { workspaceType: "business" as const, businessType: draft.businessType, displayName: draft.displayName, phoneE164: draft.supportPhone, city: draft.city, status: submit ? "submitted" as const : "draft" as const, submittedAt: submit ? now : null, reviewNote: null };

  if (!application) {
    await db.insert(workspaceApplications).values({ userId, ...applicationValues });
    application = await ownedBusinessApplication(userId);
  } else {
    await db.update(workspaceApplications).set(applicationValues).where(eq(workspaceApplications.id, application.id));
  }
  if (!application) throw new Error("Business application could not be created.");

  const detailValues = {
    applicationId: application.id, legalName: draft.legalName, displayName: draft.displayName, supportPhone: draft.supportPhone, city: draft.city, addressLine1: draft.addressLine1, description: draft.description ?? null, pickupInstructions: draft.pickupInstructions ?? null, prepTimeMinutes: draft.prepTimeMinutes, openingTime: draft.openingTime, closingTime: draft.closingTime, cuisine: draft.restaurant?.cuisine ?? null, cloudKitchenPayload: draft.cloudKitchen ? JSON.stringify(draft.cloudKitchen) : null, serviceZonePayload: JSON.stringify(draft.serviceZone), menuPayload: JSON.stringify(draft.menu),
  };
  await db.insert(businessApplicationDetails).values(detailValues).onDuplicateKeyUpdate({ set: { ...detailValues, updatedAt: now } });
  const requirements = requiredChecklistForBusinessType(draft.businessType);
  for (const requirementKey of requirements) await db.insert(businessReviewChecklists).values({ applicationId: application.id, requirementKey }).onDuplicateKeyUpdate({ set: { updatedAt: now } });

  if (submit) {
    const errors = validateBusinessApplicationDraft(draft);
    const docs = await db.select().from(businessDocuments).where(eq(businessDocuments.applicationId, application.id));
    const uploadedTypes = new Set(docs.filter((doc) => doc.status !== "rejected").map((doc) => doc.documentType));
    for (const requirementKey of requirements) if (!uploadedTypes.has(requirementKey as BusinessDocumentType)) errors.push(`${requirementKey.replace(/_/g, " ")} document is required.`);
    if (errors.length) throw new Error(errors.join(" "));
    await db.update(workspaceApplications).set({ status: "submitted", submittedAt: now }).where(eq(workspaceApplications.id, application.id));
  }
  await db.insert(auditEvents).values({ actorUserId: userId, entityType: "business_application", entityId: String(application.id), action: submit ? "business_application_submitted" : "business_application_saved", nextValue: JSON.stringify({ businessType: draft.businessType, status: submit ? "submitted" : "draft" }) });
  return application.id;
}

export async function uploadBusinessDocument(userId: number, input: { documentType: BusinessDocumentType; originalName: string; mimeType: string; dataBase64: string }) {
  if (!(BUSINESS_DOCUMENT_TYPES as readonly string[]).includes(input.documentType)) throw new Error("Unsupported verification document type.");
  if (!ALLOWED_DOCUMENT_TYPES.has(input.mimeType)) throw new Error("Only PDF, JPEG, and PNG documents are allowed.");
  const application = await ownedBusinessApplication(userId);
  if (!application || !["draft", "changes_required"].includes(application.status)) throw new Error("A writable Business application is required before uploading documents.");
  const binary = Buffer.from(input.dataBase64, "base64");
  if (!binary.length || binary.length > MAX_DOCUMENT_BYTES) throw new Error("Document must be smaller than 5 MB.");
  const extension = input.mimeType === "application/pdf" ? "pdf" : input.mimeType === "image/png" ? "png" : "jpg";
  const storage = await storagePut(`business-applications/${userId}/${application.id}/${input.documentType}.${extension}`, binary, input.mimeType);
  const db = await requireDb();
  await db.insert(businessDocuments).values({ applicationId: application.id, uploadedByUserId: userId, documentType: input.documentType, storageKey: storage.key, originalName: input.originalName.slice(0, 255), mimeType: input.mimeType, sizeBytes: binary.length });
  await db.insert(businessReviewChecklists).values({ applicationId: application.id, requirementKey: input.documentType, status: "complete" }).onDuplicateKeyUpdate({ set: { status: "complete", note: null, updatedAt: new Date() } });
  await db.insert(auditEvents).values({ actorUserId: userId, entityType: "business_document", entityId: `${application.id}:${input.documentType}`, action: "business_document_uploaded", nextValue: JSON.stringify({ storageKey: storage.key, mimeType: input.mimeType, sizeBytes: binary.length }) });
  return { storageKey: storage.key };
}

export async function listBusinessApplications() {
  const db = await requireDb();
  const apps = await db.select().from(workspaceApplications).where(eq(workspaceApplications.workspaceType, "business"));
  const records = await Promise.all(apps.map(async (application) => {
    const [detail, checklist, documents] = await Promise.all([
      db.select().from(businessApplicationDetails).where(eq(businessApplicationDetails.applicationId, application.id)).limit(1),
      db.select().from(businessReviewChecklists).where(eq(businessReviewChecklists.applicationId, application.id)),
      db.select().from(businessDocuments).where(eq(businessDocuments.applicationId, application.id)),
    ]);
    return { application, detail: detail[0] ?? null, checklist, documentCount: documents.length };
  }));
  return records;
}

export async function reviewBusinessApplication(reviewerUserId: number, applicationId: number, status: ApplicationReviewStatus, reviewNote?: string) {
  const db = await requireDb();
  const applicationRows = await db.select().from(workspaceApplications).where(and(eq(workspaceApplications.id, applicationId), eq(workspaceApplications.workspaceType, "business"))).limit(1);
  const application = applicationRows[0];
  if (!application) throw new Error("Business application not found.");
  if (application.status !== "submitted") throw new Error("Only submitted Business applications can be reviewed.");
  const detailRows = await db.select().from(businessApplicationDetails).where(eq(businessApplicationDetails.applicationId, applicationId)).limit(1);
  const detail = detailRows[0];
  const businessType = application.businessType;
  if (!detail || !businessType) throw new Error("Business application data is incomplete.");

  await db.transaction(async (tx) => {
    const now = new Date();
    await tx.update(workspaceApplications).set({ status, reviewNote: reviewNote?.trim() || null, reviewedAt: now, reviewedByUserId: reviewerUserId }).where(eq(workspaceApplications.id, applicationId));
    if (status === "approved") {
      const existingOrganisation = await tx.select().from(businessOrganisations).where(eq(businessOrganisations.applicationId, applicationId)).limit(1);
      let organisation = existingOrganisation[0];
      if (!organisation) {
        await tx.insert(businessOrganisations).values({ applicationId, ownerUserId: application.userId, businessType, legalName: detail.legalName!, displayName: detail.displayName!, supportPhone: detail.supportPhone!, city: detail.city!, status: "approved" });
        organisation = (await tx.select().from(businessOrganisations).where(eq(businessOrganisations.applicationId, applicationId)).limit(1))[0];
      }
      if (!organisation) throw new Error("Business activation could not create an organisation.");
      await tx.insert(businessStaffMemberships).values({ organisationId: organisation.id, userId: application.userId, staffRole: "owner" }).onDuplicateKeyUpdate({ set: { isActive: true, updatedAt: now } });
      const zone = parseJson(detail.serviceZonePayload, { name: `${detail.city} core`, deliveryFeeMinor: 0, minimumOrderMinor: 0 });
      const menu = parseJson<Array<{ category: string; items: Array<{ name: string; description?: string; priceMinor: number; prepTimeMinutes: number }> }>>(detail.menuPayload, []);
      if (businessType === "restaurant") {
        await tx.insert(businessOutlets).values({ organisationId: organisation.id, name: detail.displayName!, cuisine: detail.cuisine!, description: detail.description, addressLine1: detail.addressLine1!, city: detail.city!, pickupInstructions: detail.pickupInstructions, prepTimeMinutes: detail.prepTimeMinutes!, status: "approved" });
        const outlet = (await tx.select().from(businessOutlets).where(eq(businessOutlets.organisationId, organisation.id)).limit(1))[0];
        if (!outlet) throw new Error("Restaurant outlet activation failed.");
        await tx.insert(serviceZones).values({ organisationId: organisation.id, outletId: outlet.id, name: zone.name, city: detail.city!, deliveryFeeMinor: zone.deliveryFeeMinor, minimumOrderMinor: zone.minimumOrderMinor });
        for (let weekday = 0; weekday < 7; weekday++) await tx.insert(businessHours).values({ scopeType: "outlet", scopeId: outlet.id, weekday, opensAt: detail.openingTime, closesAt: detail.closingTime }).onDuplicateKeyUpdate({ set: { opensAt: detail.openingTime, closesAt: detail.closingTime, isClosed: false, updatedAt: now } });
        for (const [order, category] of menu.entries()) { await tx.insert(menuCategories).values({ outletId: outlet.id, name: category.category, sortOrder: order }); const storedCategory = (await tx.select().from(menuCategories).where(and(eq(menuCategories.outletId, outlet.id), eq(menuCategories.name, category.category))).limit(1))[0]; if (storedCategory) for (const item of category.items) await tx.insert(menuItems).values({ categoryId: storedCategory.id, name: item.name, description: item.description ?? null, priceMinor: item.priceMinor, prepTimeMinutes: item.prepTimeMinutes }); }
      } else {
        const kitchenPayload = parseJson<NonNullable<BusinessApplicationDraft["cloudKitchen"]>>(detail.cloudKitchenPayload, { kitchenName: detail.displayName ?? "Cloud Kitchen", capacityLimit: 10, brands: [], stations: [] });
        await tx.insert(cloudKitchens).values({ organisationId: organisation.id, name: kitchenPayload.kitchenName, addressLine1: detail.addressLine1!, city: detail.city!, pickupInstructions: detail.pickupInstructions, capacityLimit: kitchenPayload.capacityLimit, activeOrderLimit: kitchenPayload.capacityLimit, status: "approved" });
        const kitchen = (await tx.select().from(cloudKitchens).where(eq(cloudKitchens.organisationId, organisation.id)).limit(1))[0];
        if (!kitchen) throw new Error("Cloud Kitchen activation failed.");
        await tx.insert(serviceZones).values({ organisationId: organisation.id, cloudKitchenId: kitchen.id, name: zone.name, city: detail.city!, deliveryFeeMinor: zone.deliveryFeeMinor, minimumOrderMinor: zone.minimumOrderMinor });
        for (let weekday = 0; weekday < 7; weekday++) await tx.insert(businessHours).values({ scopeType: "cloud_kitchen", scopeId: kitchen.id, weekday, opensAt: detail.openingTime, closesAt: detail.closingTime }).onDuplicateKeyUpdate({ set: { opensAt: detail.openingTime, closesAt: detail.closingTime, isClosed: false, updatedAt: now } });
        for (const station of kitchenPayload.stations) await tx.insert(productionStations).values({ cloudKitchenId: kitchen.id, name: station.name, capacityLimit: station.capacity });
        for (const brand of kitchenPayload.brands) { await tx.insert(kitchenBrands).values({ cloudKitchenId: kitchen.id, name: brand.name, cuisine: brand.cuisine, description: brand.description ?? null, prepTimeMinutes: detail.prepTimeMinutes! }); const storedBrand = (await tx.select().from(kitchenBrands).where(and(eq(kitchenBrands.cloudKitchenId, kitchen.id), eq(kitchenBrands.name, brand.name))).limit(1))[0]; if (storedBrand) for (const [order, category] of menu.entries()) { await tx.insert(menuCategories).values({ kitchenBrandId: storedBrand.id, name: category.category, sortOrder: order }); const storedCategory = (await tx.select().from(menuCategories).where(and(eq(menuCategories.kitchenBrandId, storedBrand.id), eq(menuCategories.name, category.category))).limit(1))[0]; if (storedCategory) for (const item of category.items) await tx.insert(menuItems).values({ categoryId: storedCategory.id, name: item.name, description: item.description ?? null, priceMinor: item.priceMinor, prepTimeMinutes: item.prepTimeMinutes }); } }
      }
      await tx.insert(workspaceMemberships).values({ userId: application.userId, workspaceType: "business", status: "active", applicationId, approvedAt: now }).onDuplicateKeyUpdate({ set: { status: "active", applicationId, approvedAt: now, suspendedAt: null, suspensionReason: null, updatedAt: now } });
    }
    if (status === "suspended") await tx.insert(workspaceMemberships).values({ userId: application.userId, workspaceType: "business", status: "suspended", applicationId, suspendedAt: now, suspensionReason: reviewNote?.trim() || "Suspended by operations" }).onDuplicateKeyUpdate({ set: { status: "suspended", suspendedAt: now, suspensionReason: reviewNote?.trim() || "Suspended by operations", updatedAt: now } });
    await tx.insert(auditEvents).values({ actorUserId: reviewerUserId, entityType: "business_application", entityId: String(applicationId), action: `business_application_${status}`, previousValue: JSON.stringify({ status: application.status }), nextValue: JSON.stringify({ status, reviewNote: reviewNote?.trim() || null }) });
  });
}

export async function getMyBusinessOperations(userId: number) {
  const db = await requireDb();
  const membership = (await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceType, "business"), eq(workspaceMemberships.status, "active"))).limit(1))[0];
  if (!membership) throw new Error("An approved active Business workspace is required.");
  const organisation = (await db.select().from(businessOrganisations).where(and(eq(businessOrganisations.applicationId, membership.applicationId!), eq(businessOrganisations.ownerUserId, userId))).limit(1))[0];
  if (!organisation) throw new Error("Business operation record is unavailable.");
  const [outlets, kitchens] = await Promise.all([db.select().from(businessOutlets).where(eq(businessOutlets.organisationId, organisation.id)), db.select().from(cloudKitchens).where(eq(cloudKitchens.organisationId, organisation.id))]);
  return { organisation, outlets, kitchens };
}
