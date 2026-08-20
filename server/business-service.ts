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
  menuModifiers,
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

async function getOwnedLiveBusinessContext(userId: number) {
  const db = await requireDb();
  const membership = (await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceType, "business"), eq(workspaceMemberships.status, "active"))).limit(1))[0];
  if (!membership?.applicationId) throw new Error("An approved active Business workspace is required.");
  const organisation = (await db.select().from(businessOrganisations).where(and(eq(businessOrganisations.applicationId, membership.applicationId), eq(businessOrganisations.ownerUserId, userId))).limit(1))[0];
  if (!organisation) throw new Error("Business operation record is unavailable.");
  const [outlets, kitchens] = await Promise.all([
    db.select().from(businessOutlets).where(eq(businessOutlets.organisationId, organisation.id)),
    db.select().from(cloudKitchens).where(eq(cloudKitchens.organisationId, organisation.id)),
  ]);
  const brands = kitchens[0] ? await db.select().from(kitchenBrands).where(eq(kitchenBrands.cloudKitchenId, kitchens[0].id)) : [];
  return { db, organisation, outlets, kitchens, brands };
}

async function catalogForContext(context: Awaited<ReturnType<typeof getOwnedLiveBusinessContext>>) {
  const { db, outlets, brands } = context;
  const allCategories = await db.select().from(menuCategories);
  const outletIds = new Set(outlets.map((outlet) => outlet.id));
  const brandIds = new Set(brands.map((brand) => brand.id));
  const categories = allCategories.filter((category) => (category.outletId !== null && outletIds.has(category.outletId)) || (category.kitchenBrandId !== null && brandIds.has(category.kitchenBrandId)));
  const categoryIds = new Set(categories.map((category) => category.id));
  const items = (await db.select().from(menuItems)).filter((item) => categoryIds.has(item.categoryId));
  const itemIds = new Set(items.map((item) => item.id));
  const modifiers = (await db.select().from(menuModifiers)).filter((modifier) => itemIds.has(modifier.menuItemId));
  return { categories, items, modifiers };
}

function firstCatalogueScope(context: Awaited<ReturnType<typeof getOwnedLiveBusinessContext>>, scopeId?: number) {
  if (context.organisation.businessType === "restaurant") {
    const outlet = scopeId ? context.outlets.find((candidate) => candidate.id === scopeId) : context.outlets[0];
    if (!outlet) throw new Error("A Restaurant outlet is required before adding a category.");
    return { outletId: outlet.id, kitchenBrandId: null };
  }
  const brand = scopeId ? context.brands.find((candidate) => candidate.id === scopeId) : context.brands[0];
  if (!brand) throw new Error("A Cloud Kitchen brand is required before adding a category.");
  return { outletId: null, kitchenBrandId: brand.id };
}

export async function getManagedCatalogue(userId: number) {
  const context = await getOwnedLiveBusinessContext(userId);
  const catalogue = await catalogForContext(context);
  return { organisation: context.organisation, outlets: context.outlets, kitchens: context.kitchens, brands: context.brands, ...catalogue };
}

export async function createCatalogueCategory(userId: number, input: { name: string; scopeId?: number; sortOrder?: number }) {
  const context = await getOwnedLiveBusinessContext(userId);
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  const scope = firstCatalogueScope(context, input.scopeId);
  await context.db.insert(menuCategories).values({ ...scope, name: name.slice(0, 120), sortOrder: Math.max(0, input.sortOrder ?? 0) });
  const category = (await catalogForContext(context)).categories.find((candidate) => candidate.name === name && candidate.outletId === scope.outletId && candidate.kitchenBrandId === scope.kitchenBrandId);
  if (!category) throw new Error("Category could not be created.");
  await context.db.insert(auditEvents).values({ actorUserId: userId, entityType: "menu_category", entityId: String(category.id), action: "menu_category_created", nextValue: JSON.stringify({ name, scope }) });
  return category;
}

export async function updateCatalogueCategory(userId: number, input: { categoryId: number; name: string; sortOrder: number; isActive: boolean }) {
  const context = await getOwnedLiveBusinessContext(userId);
  const catalogue = await catalogForContext(context);
  const category = catalogue.categories.find((candidate) => candidate.id === input.categoryId);
  if (!category) throw new Error("This menu category is outside your Business workspace.");
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  await context.db.update(menuCategories).set({ name: name.slice(0, 120), sortOrder: Math.max(0, input.sortOrder), isActive: input.isActive, updatedAt: new Date() }).where(eq(menuCategories.id, category.id));
  await context.db.insert(auditEvents).values({ actorUserId: userId, entityType: "menu_category", entityId: String(category.id), action: "menu_category_updated" });
}

export async function createCatalogueItem(userId: number, input: { categoryId: number; name: string; description?: string; priceMinor: number; prepTimeMinutes: number }) {
  const context = await getOwnedLiveBusinessContext(userId);
  const catalogue = await catalogForContext(context);
  const category = catalogue.categories.find((candidate) => candidate.id === input.categoryId && candidate.isActive);
  if (!category) throw new Error("Choose an active category owned by your Business.");
  const name = input.name.trim();
  if (!name || input.priceMinor < 0 || input.prepTimeMinutes < 1) throw new Error("Item name, price, and preparation time are required.");
  await context.db.insert(menuItems).values({ categoryId: category.id, name: name.slice(0, 160), description: input.description?.trim() || null, priceMinor: input.priceMinor, prepTimeMinutes: input.prepTimeMinutes, isAvailable: true });
  const item = (await catalogForContext(context)).items.find((candidate) => candidate.categoryId === category.id && candidate.name === name);
  if (!item) throw new Error("Menu item could not be created.");
  await context.db.insert(auditEvents).values({ actorUserId: userId, entityType: "menu_item", entityId: String(item.id), action: "menu_item_created", nextValue: JSON.stringify({ categoryId: category.id, priceMinor: input.priceMinor }) });
  return item;
}

export async function updateCatalogueItem(userId: number, input: { itemId: number; name: string; description?: string; priceMinor: number; prepTimeMinutes: number; isAvailable: boolean }) {
  const context = await getOwnedLiveBusinessContext(userId);
  const catalogue = await catalogForContext(context);
  const item = catalogue.items.find((candidate) => candidate.id === input.itemId);
  if (!item) throw new Error("This menu item is outside your Business workspace.");
  const name = input.name.trim();
  if (!name || input.priceMinor < 0 || input.prepTimeMinutes < 1) throw new Error("Item name, price, and preparation time are required.");
  await context.db.update(menuItems).set({ name: name.slice(0, 160), description: input.description?.trim() || null, priceMinor: input.priceMinor, prepTimeMinutes: input.prepTimeMinutes, isAvailable: input.isAvailable, updatedAt: new Date() }).where(eq(menuItems.id, item.id));
  await context.db.insert(auditEvents).values({ actorUserId: userId, entityType: "menu_item", entityId: String(item.id), action: "menu_item_updated", nextValue: JSON.stringify({ priceMinor: input.priceMinor, isAvailable: input.isAvailable }) });
}

export async function createCatalogueModifier(userId: number, input: { menuItemId: number; name: string; priceMinor: number; isRequired: boolean }) {
  const context = await getOwnedLiveBusinessContext(userId);
  const catalogue = await catalogForContext(context);
  if (!catalogue.items.some((item) => item.id === input.menuItemId)) throw new Error("This menu item is outside your Business workspace.");
  const name = input.name.trim();
  if (!name || input.priceMinor < 0) throw new Error("Modifier name and price are required.");
  await context.db.insert(menuModifiers).values({ menuItemId: input.menuItemId, name: name.slice(0, 120), priceMinor: input.priceMinor, isRequired: input.isRequired, isAvailable: true });
  await context.db.insert(auditEvents).values({ actorUserId: userId, entityType: "menu_modifier", entityId: `${input.menuItemId}:${name}`, action: "menu_modifier_created", nextValue: JSON.stringify({ priceMinor: input.priceMinor, isRequired: input.isRequired }) });
}

export async function updateCatalogueModifier(userId: number, input: { modifierId: number; name: string; priceMinor: number; isRequired: boolean; isAvailable: boolean }) {
  const context = await getOwnedLiveBusinessContext(userId);
  const catalogue = await catalogForContext(context);
  const modifier = catalogue.modifiers.find((candidate) => candidate.id === input.modifierId);
  if (!modifier) throw new Error("This modifier is outside your Business workspace.");
  const name = input.name.trim();
  if (!name || input.priceMinor < 0) throw new Error("Modifier name and price are required.");
  await context.db.update(menuModifiers).set({ name: name.slice(0, 120), priceMinor: input.priceMinor, isRequired: input.isRequired, isAvailable: input.isAvailable, updatedAt: new Date() }).where(eq(menuModifiers.id, modifier.id));
  await context.db.insert(auditEvents).values({ actorUserId: userId, entityType: "menu_modifier", entityId: String(modifier.id), action: "menu_modifier_updated" });
}

export async function setBusinessLiveStatus(userId: number, status: "live" | "paused") {
  const context = await getOwnedLiveBusinessContext(userId);
  await context.db.update(businessOrganisations).set({ status, updatedAt: new Date() }).where(eq(businessOrganisations.id, context.organisation.id));
  await context.db.insert(auditEvents).values({ actorUserId: userId, entityType: "business_organisation", entityId: String(context.organisation.id), action: `business_${status}` });
  return { status };
}

export async function getLiveBusinessDiscovery(filter?: "restaurant" | "cloud_kitchen") {
  const db = await requireDb();
  const organisations = (await db.select().from(businessOrganisations).where(eq(businessOrganisations.status, "live"))).filter((organisation) => !filter || organisation.businessType === filter);
  const records = await Promise.all(organisations.map(async (organisation) => {
    const [outlets, kitchens] = await Promise.all([
      db.select().from(businessOutlets).where(eq(businessOutlets.organisationId, organisation.id)),
      db.select().from(cloudKitchens).where(eq(cloudKitchens.organisationId, organisation.id)),
    ]);
    const outlet = outlets.find((candidate) => !candidate.isPaused && candidate.status !== "suspended") ?? outlets[0];
    const kitchen = kitchens.find((candidate) => !candidate.isPaused && candidate.status !== "suspended") ?? kitchens[0];
    const brands = kitchen ? await db.select().from(kitchenBrands).where(eq(kitchenBrands.cloudKitchenId, kitchen.id)) : [];
    const categories = await db.select().from(menuCategories);
    const entityCategories = categories.filter((category) => (outlet && category.outletId === outlet.id) || brands.some((brand) => category.kitchenBrandId === brand.id));
    const categoryIds = new Set(entityCategories.map((category) => category.id));
    const items = (await db.select().from(menuItems)).filter((item) => categoryIds.has(item.categoryId) && item.isAvailable);
    return { id: organisation.id, businessType: organisation.businessType, displayName: organisation.displayName, city: organisation.city, cuisine: organisation.businessType === "restaurant" ? outlet?.cuisine ?? "Mixed" : brands.map((brand) => brand.cuisine).filter(Boolean).join(" • ") || "Cloud Kitchen", description: outlet?.description ?? brands[0]?.description ?? null, itemCount: items.length, isOpen: organisation.status === "live" && !(outlet?.isPaused || kitchen?.isPaused), deliveryLabel: organisation.businessType === "restaurant" ? "Restaurant delivery" : `${brands.length} kitchen brand${brands.length === 1 ? "" : "s"}` };
  }));
  return records.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
