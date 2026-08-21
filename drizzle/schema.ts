import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { BUSINESS_TYPES, WORKSPACE_APPLICATION_STATUSES, WORKSPACE_APPLICATION_TYPES, WORKSPACE_MEMBERSHIP_STATUSES, WORKSPACE_TYPES } from "../shared/workspace";
import { BUSINESS_CHECKLIST_STATUSES, BUSINESS_DOCUMENT_STATUSES, BUSINESS_DOCUMENT_TYPES, BUSINESS_OPERATIONAL_STATUSES, BUSINESS_SCOPE_TYPES, BUSINESS_STAFF_ROLES } from "../shared/business";
import { ORDER_PAYMENT_METHODS, ORDER_PAYMENT_STATUSES, ORDER_STATUSES } from "../shared/order";

export { BUSINESS_TYPES, WORKSPACE_APPLICATION_STATUSES, WORKSPACE_APPLICATION_TYPES, WORKSPACE_MEMBERSHIP_STATUSES, WORKSPACE_TYPES } from "../shared/workspace";

/**
 * Core identity record created by the platform OAuth flow. Product-specific
 * workspaces and verified contact data are kept in separate tables so one
 * person can safely hold Customer, Business, and Rider roles.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Customer-facing profile data. Phone verification is represented explicitly
 * so OAuth identity and delivery contact identity can be governed separately.
 */
export const accountProfiles = mysqlTable("account_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  givenName: varchar("givenName", { length: 100 }),
  phoneE164: varchar("phoneE164", { length: 20 }),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  defaultCity: varchar("defaultCity", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("account_profiles_user_unique").on(table.userId),
  uniqueIndex("account_profiles_phone_unique").on(table.phoneE164),
]);

export const customerAddresses = mysqlTable("customer_addresses", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), label: varchar("label", { length: 80 }).notNull(), recipientName: varchar("recipientName", { length: 160 }).notNull(), phoneE164: varchar("phoneE164", { length: 20 }).notNull(), addressLine1: varchar("addressLine1", { length: 255 }).notNull(), addressLine2: varchar("addressLine2", { length: 255 }), city: varchar("city", { length: 120 }).notNull(), instructions: varchar("instructions", { length: 500 }), latitudeE6: int("latitudeE6").notNull(), longitudeE6: int("longitudeE6").notNull(), geocodeSource: mysqlEnum("geocodeSource", ["device", "manual"]).default("device").notNull(), isDefault: boolean("isDefault").default(false).notNull(), archivedAt: timestamp("archivedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("customer_addresses_user_index").on(table.userId, table.archivedAt), index("customer_addresses_coordinates_index").on(table.city, table.latitudeE6, table.longitudeE6)]);

/**
 * A workspace is an approved role context inside the single app. Customer is
 * created automatically; Business and Rider are approval-gated.
 */
export const workspaceMemberships = mysqlTable("workspace_memberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workspaceType: mysqlEnum("workspaceType", WORKSPACE_TYPES).notNull(),
  status: mysqlEnum("status", WORKSPACE_MEMBERSHIP_STATUSES).default("active").notNull(),
  applicationId: int("applicationId"),
  approvedAt: timestamp("approvedAt"),
  suspendedAt: timestamp("suspendedAt"),
  suspensionReason: varchar("suspensionReason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_memberships_user_workspace_unique").on(table.userId, table.workspaceType),
  index("workspace_memberships_user_index").on(table.userId),
  index("workspace_memberships_status_index").on(table.workspaceType, table.status),
]);

/**
 * Approval workflow for Business (Restaurant or Cloud Kitchen) and Rider.
 * Drafts are mutable; submitted applications are reviewed by Admin staff.
 */
export const workspaceApplications = mysqlTable("workspace_applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workspaceType: mysqlEnum("workspaceType", WORKSPACE_APPLICATION_TYPES).notNull(),
  businessType: mysqlEnum("businessType", BUSINESS_TYPES),
  status: mysqlEnum("status", WORKSPACE_APPLICATION_STATUSES).default("draft").notNull(),
  displayName: varchar("displayName", { length: 160 }),
  phoneE164: varchar("phoneE164", { length: 20 }),
  city: varchar("city", { length: 120 }),
  reviewNote: varchar("reviewNote", { length: 1000 }),
  submittedAt: timestamp("submittedAt"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedByUserId: int("reviewedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_applications_user_workspace_unique").on(table.userId, table.workspaceType),
  index("workspace_applications_status_index").on(table.workspaceType, table.status),
  index("workspace_applications_reviewer_index").on(table.reviewedByUserId),
]);

/**
 * Append-only compliance and operations trail. Values are serialised JSON so
 * every protected workspace action can retain before/after context.
 */
export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  previousValue: text("previousValue"),
  nextValue: text("nextValue"),
  correlationId: varchar("correlationId", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("audit_events_actor_index").on(table.actorUserId),
  index("audit_events_entity_index").on(table.entityType, table.entityId),
  index("audit_events_correlation_index").on(table.correlationId),
]);

/**
 * Transactional outbox for cross-domain events. A domain writes its own state
 * and its integration event in the same database transaction; a future worker
 * can publish pending records with retry and idempotency guarantees.
 */
export const domainOutboxEvents = mysqlTable("domain_outbox_events", {
  id: int("id").autoincrement().primaryKey(),
  domain: varchar("domain", { length: 80 }).notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  aggregateType: varchar("aggregateType", { length: 80 }).notNull(),
  aggregateId: varchar("aggregateId", { length: 80 }).notNull(),
  payload: text("payload").notNull(),
  deduplicationKey: varchar("deduplicationKey", { length: 180 }).notNull(),
  attempts: int("attempts").default(0).notNull(),
  lastError: text("lastError"),
  nextAttemptAt: timestamp("nextAttemptAt"),
  processedAt: timestamp("processedAt"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("domain_outbox_events_dedupe_unique").on(table.deduplicationKey),
  index("domain_outbox_events_pending_index").on(table.domain, table.processedAt, table.nextAttemptAt, table.occurredAt),
  index("domain_outbox_events_aggregate_index").on(table.aggregateType, table.aggregateId),
]);

export const businessApplicationDetails = mysqlTable("business_application_details", {
  id: int("id").autoincrement().primaryKey(), applicationId: int("applicationId").notNull(), legalName: varchar("legalName", { length: 180 }), displayName: varchar("displayName", { length: 160 }), supportPhone: varchar("supportPhone", { length: 20 }), city: varchar("city", { length: 120 }), addressLine1: varchar("addressLine1", { length: 255 }), description: text("description"), pickupInstructions: varchar("pickupInstructions", { length: 500 }), prepTimeMinutes: int("prepTimeMinutes"), openingTime: varchar("openingTime", { length: 5 }), closingTime: varchar("closingTime", { length: 5 }), cuisine: varchar("cuisine", { length: 120 }), cloudKitchenPayload: text("cloudKitchenPayload"), serviceZonePayload: text("serviceZonePayload"), menuPayload: text("menuPayload"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("business_application_details_application_unique").on(table.applicationId)]);

export const businessOrganisations = mysqlTable("business_organisations", {
  id: int("id").autoincrement().primaryKey(), applicationId: int("applicationId").notNull(), ownerUserId: int("ownerUserId").notNull(), businessType: mysqlEnum("businessType", BUSINESS_TYPES).notNull(), legalName: varchar("legalName", { length: 180 }).notNull(), displayName: varchar("displayName", { length: 160 }).notNull(), supportPhone: varchar("supportPhone", { length: 20 }).notNull(), city: varchar("city", { length: 120 }).notNull(), status: mysqlEnum("status", BUSINESS_OPERATIONAL_STATUSES).default("approved").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("business_organisations_application_unique").on(table.applicationId), index("business_organisations_owner_index").on(table.ownerUserId), index("business_organisations_status_index").on(table.businessType, table.status)]);

export const businessOutlets = mysqlTable("business_outlets", {
  id: int("id").autoincrement().primaryKey(), organisationId: int("organisationId").notNull(), name: varchar("name", { length: 160 }).notNull(), cuisine: varchar("cuisine", { length: 120 }).notNull(), description: text("description"), addressLine1: varchar("addressLine1", { length: 255 }).notNull(), city: varchar("city", { length: 120 }).notNull(), latitudeE6: int("latitudeE6"), longitudeE6: int("longitudeE6"), pickupInstructions: varchar("pickupInstructions", { length: 500 }), prepTimeMinutes: int("prepTimeMinutes").notNull(), acceptsDelivery: boolean("acceptsDelivery").default(true).notNull(), isPaused: boolean("isPaused").default(false).notNull(), status: mysqlEnum("status", BUSINESS_OPERATIONAL_STATUSES).default("approved").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("business_outlets_organisation_index").on(table.organisationId), index("business_outlets_status_index").on(table.city, table.status)]);

export const cloudKitchens = mysqlTable("cloud_kitchens", {
  id: int("id").autoincrement().primaryKey(), organisationId: int("organisationId").notNull(), name: varchar("name", { length: 160 }).notNull(), addressLine1: varchar("addressLine1", { length: 255 }).notNull(), city: varchar("city", { length: 120 }).notNull(), pickupInstructions: varchar("pickupInstructions", { length: 500 }), capacityLimit: int("capacityLimit").notNull(), activeOrderLimit: int("activeOrderLimit").notNull(), isPaused: boolean("isPaused").default(false).notNull(), status: mysqlEnum("status", BUSINESS_OPERATIONAL_STATUSES).default("approved").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("cloud_kitchens_organisation_unique").on(table.organisationId), index("cloud_kitchens_status_index").on(table.city, table.status)]);

export const kitchenBrands = mysqlTable("kitchen_brands", {
  id: int("id").autoincrement().primaryKey(), cloudKitchenId: int("cloudKitchenId").notNull(), name: varchar("name", { length: 160 }).notNull(), cuisine: varchar("cuisine", { length: 120 }).notNull(), description: text("description"), prepTimeMinutes: int("prepTimeMinutes").notNull(), isActive: boolean("isActive").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("kitchen_brands_kitchen_index").on(table.cloudKitchenId)]);

export const productionStations = mysqlTable("production_stations", {
  id: int("id").autoincrement().primaryKey(), cloudKitchenId: int("cloudKitchenId").notNull(), name: varchar("name", { length: 120 }).notNull(), capacityLimit: int("capacityLimit").notNull(), isActive: boolean("isActive").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("production_stations_kitchen_index").on(table.cloudKitchenId)]);

export const serviceZones = mysqlTable("service_zones", {
  id: int("id").autoincrement().primaryKey(), organisationId: int("organisationId").notNull(), outletId: int("outletId"), cloudKitchenId: int("cloudKitchenId"), name: varchar("name", { length: 120 }).notNull(), city: varchar("city", { length: 120 }).notNull(), centerLatitudeE6: int("centerLatitudeE6"), centerLongitudeE6: int("centerLongitudeE6"), radiusMeters: int("radiusMeters"), courierBaseMinutes: int("courierBaseMinutes").default(8).notNull(), courierMinutesPerKm: int("courierMinutesPerKm").default(3).notNull(), deliveryFeeMinor: int("deliveryFeeMinor").default(0).notNull(), minimumOrderMinor: int("minimumOrderMinor").default(0).notNull(), isActive: boolean("isActive").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("service_zones_organisation_index").on(table.organisationId), index("service_zones_city_index").on(table.city, table.isActive)]);

export const businessHours = mysqlTable("business_hours", {
  id: int("id").autoincrement().primaryKey(), scopeType: mysqlEnum("scopeType", BUSINESS_SCOPE_TYPES).notNull(), scopeId: int("scopeId").notNull(), weekday: int("weekday").notNull(), opensAt: varchar("opensAt", { length: 5 }), closesAt: varchar("closesAt", { length: 5 }), isClosed: boolean("isClosed").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("business_hours_scope_day_unique").on(table.scopeType, table.scopeId, table.weekday)]);

export const menuCategories = mysqlTable("menu_categories", {
  id: int("id").autoincrement().primaryKey(), outletId: int("outletId"), kitchenBrandId: int("kitchenBrandId"), name: varchar("name", { length: 120 }).notNull(), sortOrder: int("sortOrder").default(0).notNull(), isActive: boolean("isActive").default(true).notNull(), archivedAt: timestamp("archivedAt"), archivedByUserId: int("archivedByUserId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("menu_categories_outlet_index").on(table.outletId), index("menu_categories_brand_index").on(table.kitchenBrandId)]);

export const menuItems = mysqlTable("menu_items", {
  id: int("id").autoincrement().primaryKey(), categoryId: int("categoryId").notNull(), name: varchar("name", { length: 160 }).notNull(), description: text("description"), priceMinor: int("priceMinor").notNull(), prepTimeMinutes: int("prepTimeMinutes").notNull(), imageKey: varchar("imageKey", { length: 500 }), isAvailable: boolean("isAvailable").default(true).notNull(), archivedAt: timestamp("archivedAt"), archivedByUserId: int("archivedByUserId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("menu_items_category_index").on(table.categoryId, table.isAvailable)]);

export const menuModifiers = mysqlTable("menu_modifiers", {
  id: int("id").autoincrement().primaryKey(), menuItemId: int("menuItemId").notNull(), name: varchar("name", { length: 120 }).notNull(), priceMinor: int("priceMinor").default(0).notNull(), isRequired: boolean("isRequired").default(false).notNull(), isAvailable: boolean("isAvailable").default(true).notNull(), archivedAt: timestamp("archivedAt"), archivedByUserId: int("archivedByUserId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("menu_modifiers_item_index").on(table.menuItemId, table.isAvailable)]);

/** Durable order aggregate. Money is always represented in PKR minor units. */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 40 }).notNull(),
  customerUserId: int("customerUserId").notNull(),
  organisationId: int("organisationId").notNull(),
  outletId: int("outletId"),
  kitchenBrandId: int("kitchenBrandId"),
  status: mysqlEnum("status", ORDER_STATUSES).default("placed").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ORDER_PAYMENT_METHODS).default("cod").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ORDER_PAYMENT_STATUSES).default("cash_due").notNull(),
  deliveryRecipientName: varchar("deliveryRecipientName", { length: 160 }).notNull(),
  deliveryPhoneE164: varchar("deliveryPhoneE164", { length: 20 }).notNull(),
  deliveryAddressLine1: varchar("deliveryAddressLine1", { length: 255 }).notNull(),
  deliveryAddressLine2: varchar("deliveryAddressLine2", { length: 255 }),
  deliveryCity: varchar("deliveryCity", { length: 120 }).notNull(),
  deliveryInstructions: varchar("deliveryInstructions", { length: 500 }),
  deliveryAddressId: int("deliveryAddressId"), deliveryLatitudeE6: int("deliveryLatitudeE6"), deliveryLongitudeE6: int("deliveryLongitudeE6"), deliveryZoneId: int("deliveryZoneId"), deliveryDistanceMeters: int("deliveryDistanceMeters"), estimatedCourierMinutes: int("estimatedCourierMinutes"), estimatedTotalMinutes: int("estimatedTotalMinutes"),
  itemSubtotalMinor: int("itemSubtotalMinor").notNull(),
  deliveryFeeMinor: int("deliveryFeeMinor").notNull(),
  serviceFeeMinor: int("serviceFeeMinor").default(0).notNull(),
  discountMinor: int("discountMinor").default(0).notNull(),
  totalMinor: int("totalMinor").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull(),
  placedAt: timestamp("placedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("orders_public_id_unique").on(table.publicId),
  uniqueIndex("orders_customer_idempotency_unique").on(table.customerUserId, table.idempotencyKey),
  index("orders_customer_created_index").on(table.customerUserId, table.placedAt),
  index("orders_business_status_index").on(table.organisationId, table.status, table.placedAt),
]);

/** Immutable sold-dish snapshot. Live item IDs are retained for traceability but may be null in future imports. */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  menuItemId: int("menuItemId"),
  dishName: varchar("dishName", { length: 160 }).notNull(),
  dishDescription: text("dishDescription"),
  dishImageKey: varchar("dishImageKey", { length: 500 }),
  unitPriceMinor: int("unitPriceMinor").notNull(),
  modifierTotalMinor: int("modifierTotalMinor").default(0).notNull(),
  lineTotalMinor: int("lineTotalMinor").notNull(),
  quantity: int("quantity").notNull(),
  prepTimeMinutes: int("prepTimeMinutes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("order_items_order_index").on(table.orderId)]);

/** Immutable selected-modifier snapshot for an order item. */
export const orderItemModifiers = mysqlTable("order_item_modifiers", {
  id: int("id").autoincrement().primaryKey(),
  orderItemId: int("orderItemId").notNull(),
  menuModifierId: int("menuModifierId"),
  modifierName: varchar("modifierName", { length: 120 }).notNull(),
  unitPriceMinor: int("unitPriceMinor").notNull(),
  quantity: int("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("order_item_modifiers_item_index").on(table.orderItemId)]);

/** Append-only transition history for customer support and operational audit. */
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  fromStatus: mysqlEnum("fromStatus", ORDER_STATUSES),
  toStatus: mysqlEnum("toStatus", ORDER_STATUSES).notNull(),
  actorUserId: int("actorUserId"),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("order_status_history_order_index").on(table.orderId, table.createdAt)]);

export const businessDocuments = mysqlTable("business_documents", {
  id: int("id").autoincrement().primaryKey(), applicationId: int("applicationId").notNull(), organisationId: int("organisationId"), uploadedByUserId: int("uploadedByUserId").notNull(), documentType: mysqlEnum("documentType", BUSINESS_DOCUMENT_TYPES).notNull(), status: mysqlEnum("status", BUSINESS_DOCUMENT_STATUSES).default("uploaded").notNull(), storageKey: varchar("storageKey", { length: 500 }).notNull(), originalName: varchar("originalName", { length: 255 }).notNull(), mimeType: varchar("mimeType", { length: 120 }).notNull(), sizeBytes: int("sizeBytes").notNull(), reviewerNote: varchar("reviewerNote", { length: 1000 }), reviewedByUserId: int("reviewedByUserId"), reviewedAt: timestamp("reviewedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("business_documents_application_index").on(table.applicationId, table.documentType), index("business_documents_reviewer_index").on(table.reviewedByUserId)]);

export const businessPayoutProfiles = mysqlTable("business_payout_profiles", {
  id: int("id").autoincrement().primaryKey(), organisationId: int("organisationId").notNull(), provider: varchar("provider", { length: 80 }), accountHolderName: varchar("accountHolderName", { length: 160 }), accountReference: varchar("accountReference", { length: 160 }), status: mysqlEnum("status", BUSINESS_CHECKLIST_STATUSES).default("missing").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("business_payout_profiles_org_unique").on(table.organisationId)]);

export const businessStaffMemberships = mysqlTable("business_staff_memberships", {
  id: int("id").autoincrement().primaryKey(), organisationId: int("organisationId").notNull(), userId: int("userId").notNull(), staffRole: mysqlEnum("staffRole", BUSINESS_STAFF_ROLES).notNull(), outletId: int("outletId"), cloudKitchenId: int("cloudKitchenId"), isActive: boolean("isActive").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("business_staff_org_user_unique").on(table.organisationId, table.userId), index("business_staff_user_index").on(table.userId)]);

export const businessReviewChecklists = mysqlTable("business_review_checklists", {
  id: int("id").autoincrement().primaryKey(), applicationId: int("applicationId").notNull(), requirementKey: varchar("requirementKey", { length: 120 }).notNull(), status: mysqlEnum("status", BUSINESS_CHECKLIST_STATUSES).default("missing").notNull(), note: varchar("note", { length: 1000 }), reviewedByUserId: int("reviewedByUserId"), reviewedAt: timestamp("reviewedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("business_checklist_application_key_unique").on(table.applicationId, table.requirementKey), index("business_checklist_status_index").on(table.applicationId, table.status)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AccountProfile = typeof accountProfiles.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect;
export type WorkspaceApplication = typeof workspaceApplications.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type DomainOutboxEvent = typeof domainOutboxEvents.$inferSelect;
export type BusinessApplicationDetail = typeof businessApplicationDetails.$inferSelect;
export type BusinessOrganisation = typeof businessOrganisations.$inferSelect;
export type BusinessOutlet = typeof businessOutlets.$inferSelect;
export type CloudKitchen = typeof cloudKitchens.$inferSelect;
export type KitchenBrand = typeof kitchenBrands.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderItemModifier = typeof orderItemModifiers.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
