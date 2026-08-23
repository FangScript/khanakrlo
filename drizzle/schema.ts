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

/** Approved commercial terms. Rates are basis points: 1,200 = 12.00%. */
export const businessCommissionPolicies = mysqlTable("business_commission_policies", {
  id: int("id").autoincrement().primaryKey(),
  organisationId: int("organisationId").notNull(),
  commissionRateBps: int("commissionRateBps").notNull(),
  revenueBase: mysqlEnum("revenueBase", ["item_subtotal_after_discount"]).default("item_subtotal_after_discount").notNull(),
  taxTreatment: varchar("taxTreatment", { length: 120 }).default("pilot_pending").notNull(),
  settlementCadence: varchar("settlementCadence", { length: 80 }).default("manual_pilot").notNull(),
  effectiveFrom: timestamp("effectiveFrom").defaultNow().notNull(),
  effectiveUntil: timestamp("effectiveUntil"),
  approvedByUserId: int("approvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("business_commission_policy_active_index").on(table.organisationId, table.effectiveFrom, table.effectiveUntil),
  index("business_commission_policy_approver_index").on(table.approvedByUserId),
]);

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
  commissionPolicyId: int("commissionPolicyId"),
  commissionRateBps: int("commissionRateBps").default(0).notNull(),
  commissionableSubtotalMinor: int("commissionableSubtotalMinor").default(0).notNull(),
  platformCommissionMinor: int("platformCommissionMinor").default(0).notNull(),
  restaurantPayableMinor: int("restaurantPayableMinor").default(0).notNull(),
  riderCashCustodyMinor: int("riderCashCustodyMinor").default(0).notNull(),
  settlementStatus: mysqlEnum("settlementStatus", ["unsettled", "reconciled", "variance", "waived"]).default("unsettled").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull(),
  placedAt: timestamp("placedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("orders_public_id_unique").on(table.publicId),
  uniqueIndex("orders_customer_idempotency_unique").on(table.customerUserId, table.idempotencyKey),
  index("orders_customer_created_index").on(table.customerUserId, table.placedAt),
  index("orders_business_status_index").on(table.organisationId, table.status, table.placedAt),
  index("orders_settlement_status_index").on(table.organisationId, table.settlementStatus, table.placedAt),
]);

/** The Rider explicitly confirms COD collection; delivery state alone never marks cash as paid. */
export const codCollections = mysqlTable("cod_collections", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  riderUserId: int("riderUserId").notNull(),
  expectedMinor: int("expectedMinor").notNull(),
  collectedMinor: int("collectedMinor").notNull(),
  varianceMinor: int("varianceMinor").notNull(),
  varianceReason: varchar("varianceReason", { length: 500 }),
  status: mysqlEnum("status", ["collected", "short", "over"]).notNull(),
  confirmedAt: timestamp("confirmedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cod_collections_order_unique").on(table.orderId),
  index("cod_collections_rider_confirmed_index").on(table.riderUserId, table.confirmedAt),
]);

/** Immutable double-entry-style commercial positions for pilot reconciliation. */
export const settlementLedgerEntries = mysqlTable("settlement_ledger_entries", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  organisationId: int("organisationId").notNull(),
  partyType: mysqlEnum("partyType", ["platform", "restaurant", "rider"]).notNull(),
  entryType: mysqlEnum("entryType", ["commission", "restaurant_payable", "rider_cash_custody", "collection_variance"]).notNull(),
  amountMinor: int("amountMinor").notNull(),
  status: mysqlEnum("status", ["open", "reconciled", "void"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("settlement_ledger_order_party_type_unique").on(table.orderId, table.partyType, table.entryType),
  index("settlement_ledger_org_status_index").on(table.organisationId, table.status, table.createdAt),
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

/** A customer can submit one verified review only after their order is delivered. */
export const orderReviews = mysqlTable("order_reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  organisationId: int("organisationId").notNull(),
  customerUserId: int("customerUserId").notNull(),
  rating: int("rating").notNull(),
  publicComment: varchar("publicComment", { length: 1000 }),
  privateFeedback: varchar("privateFeedback", { length: 1000 }),
  feedbackTopicsJson: varchar("feedbackTopicsJson", { length: 500 }).notNull().default("[]"),
  visibility: mysqlEnum("visibility", ["published", "hidden"]).default("published").notNull(),
  businessReply: varchar("businessReply", { length: 1000 }),
  businessRepliedAt: timestamp("businessRepliedAt"),
  moderatedByUserId: int("moderatedByUserId"),
  moderatedAt: timestamp("moderatedAt"),
  moderationNote: varchar("moderationNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("order_reviews_order_unique").on(table.orderId),
  index("order_reviews_organisation_visibility_created_index").on(table.organisationId, table.visibility, table.createdAt),
  index("order_reviews_customer_created_index").on(table.customerUserId, table.createdAt),
]);

/** Images attached to verified reviews are stored separately so each image can carry its own privacy audience. */
export const reviewPhotos = mysqlTable("review_photos", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  customerUserId: int("customerUserId").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 40 }).notNull(),
  byteSize: int("byteSize").notNull(),
  privacy: mysqlEnum("privacy", ["public", "business_only", "platform_only"]).default("business_only").notNull(),
  removedAt: timestamp("removedAt"),
  removedByUserId: int("removedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("review_photos_review_privacy_index").on(table.reviewId, table.privacy, table.createdAt),
  index("review_photos_customer_index").on(table.customerUserId, table.createdAt),
]);

/** Customer reports for public review photos; each is retained as an auditable moderation work item. */
export const reviewPhotoReports = mysqlTable("review_photo_reports", {
  id: int("id").autoincrement().primaryKey(),
  photoId: int("photoId").notNull(),
  reporterUserId: int("reporterUserId").notNull(),
  reason: mysqlEnum("reason", ["nudity", "hate_or_harassment", "violence", "spam", "other"]).notNull(),
  details: varchar("details", { length: 500 }),
  status: mysqlEnum("status", ["open", "resolved", "dismissed"]).default("open").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("review_photo_reports_photo_reporter_index").on(table.photoId, table.reporterUserId, table.status),
  index("review_photo_reports_status_created_index").on(table.status, table.createdAt),
]);

/** One authoritative manual-dispatch assignment per order. Assignment is immutable for customer audit; reassignment is deliberately deferred. */
export const riderAssignments = mysqlTable("rider_assignments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  riderUserId: int("riderUserId").notNull(),
  assignedByUserId: int("assignedByUserId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  offerStatus: mysqlEnum("offerStatus", ["offered", "accepted", "declined", "expired"]).default("accepted").notNull(),
  offerExpiresAt: timestamp("offerExpiresAt"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("rider_assignments_order_unique").on(table.orderId), index("rider_assignments_rider_status_index").on(table.riderUserId, table.assignedAt)]);

/** Current dispatch eligibility for an active Rider. Existing accepted jobs remain visible if the Rider later goes offline. */
export const riderAvailability = mysqlTable("rider_availability", {
  id: int("id").autoincrement().primaryKey(), riderUserId: int("riderUserId").notNull(), status: mysqlEnum("status", ["online", "offline"]).default("offline").notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("rider_availability_rider_unique").on(table.riderUserId), index("rider_availability_status_updated_index").on(table.status, table.updatedAt)]);

/** Controlled-pilot Rider balance. Negative balance represents platform commission reserved/deducted from the Rider account. */
export const riderCashAccounts = mysqlTable("rider_cash_accounts", {
  id: int("id").autoincrement().primaryKey(), riderUserId: int("riderUserId").notNull(), balanceMinor: int("balanceMinor").default(0).notNull(), status: mysqlEnum("status", ["active", "restricted", "suspended"]).default("active").notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("rider_cash_accounts_rider_unique").on(table.riderUserId)]);

export const riderCashAccountEntries = mysqlTable("rider_cash_account_entries", {
  id: int("id").autoincrement().primaryKey(), riderCashAccountId: int("riderCashAccountId").notNull(), riderUserId: int("riderUserId").notNull(), orderId: int("orderId"), entryType: mysqlEnum("entryType", ["commission_reserved", "commission_released", "cash_collected", "cash_variance", "settlement_adjustment"]).notNull(), amountMinor: int("amountMinor").notNull(), balanceAfterMinor: int("balanceAfterMinor").notNull(), reference: varchar("reference", { length: 160 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("rider_cash_entries_order_type_unique").on(table.orderId, table.entryType), index("rider_cash_entries_rider_created_index").on(table.riderUserId, table.createdAt)]);

/** Immutable Rider remittance receipt data. A receipt is created with its settlement ledger entry and is retrievable only by its Rider owner. */
export const riderCashSettlementReceipts = mysqlTable("rider_cash_settlement_receipts", {
  id: int("id").autoincrement().primaryKey(), riderUserId: int("riderUserId").notNull(), riderCashAccountId: int("riderCashAccountId").notNull(), cashAccountEntryId: int("cashAccountEntryId").notNull(), receiptCode: varchar("receiptCode", { length: 80 }).notNull(), amountMinor: int("amountMinor").notNull(), balanceAfterMinor: int("balanceAfterMinor").notNull(), reconciledOrderIdsJson: text("reconciledOrderIdsJson").notNull(), issuedAt: timestamp("issuedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("rider_cash_receipts_code_unique").on(table.receiptCode), uniqueIndex("rider_cash_receipts_entry_unique").on(table.cashAccountEntryId), index("rider_cash_receipts_rider_issued_index").on(table.riderUserId, table.issuedAt)]);

/** Internal staff permissions refine the existing administrator identity; absent legacy assignments retain senior operations access for the existing platform admin. */
export const adminStaffRoles = mysqlTable("admin_staff_roles", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), staffRole: mysqlEnum("staffRole", ["support_agent", "moderation_agent", "finance_operator", "senior_operations"]).notNull(), status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(), grantedByUserId: int("grantedByUserId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("admin_staff_roles_user_unique").on(table.userId), index("admin_staff_roles_role_status_index").on(table.staffRole, table.status)]);

/** Append-only evidence of senior-operator delegation and deactivation decisions. */
export const adminStaffRoleEvents = mysqlTable("admin_staff_role_events", {
  id: int("id").autoincrement().primaryKey(), targetUserId: int("targetUserId").notNull(), actorUserId: int("actorUserId").notNull(), previousRole: mysqlEnum("previousRole", ["support_agent", "moderation_agent", "finance_operator", "senior_operations"]), nextRole: mysqlEnum("nextRole", ["support_agent", "moderation_agent", "finance_operator", "senior_operations"]), action: mysqlEnum("action", ["provisioned", "delegated", "deactivated", "reactivated"]).notNull(), note: varchar("note", { length: 500 }), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_staff_role_events_target_created_index").on(table.targetUserId, table.createdAt), index("admin_staff_role_events_actor_created_index").on(table.actorUserId, table.createdAt)]);

/** Structured internal cases attach Admin workflow state to emergency Business action and Rider remittance review without modifying immutable source ledgers. */
export const adminOperationalCases = mysqlTable("admin_operational_cases", {
  id: int("id").autoincrement().primaryKey(), caseType: mysqlEnum("caseType", ["business_emergency", "rider_remittance"]).notNull(), targetId: int("targetId").notNull(), status: mysqlEnum("status", ["open", "in_progress", "resolved", "dismissed"]).default("open").notNull(), priority: mysqlEnum("priority", ["normal", "high", "critical"]).default("normal").notNull(), reason: varchar("reason", { length: 500 }).notNull(), internalNote: text("internalNote"), assignedAdminUserId: int("assignedAdminUserId"), openedByUserId: int("openedByUserId").notNull(), resolvedByUserId: int("resolvedByUserId"), reviewDueAt: timestamp("reviewDueAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("admin_operational_cases_status_created_index").on(table.status, table.createdAt), index("admin_operational_cases_target_index").on(table.caseType, table.targetId), index("admin_operational_cases_assignee_index").on(table.assignedAdminUserId, table.status)]);

/** Append-only ownership transitions for operational cases; the live assignee remains on the case for fast queue reads. */
export const adminCaseAssignments = mysqlTable("admin_case_assignments", {
  id: int("id").autoincrement().primaryKey(), caseId: int("caseId").notNull(), assignedByUserId: int("assignedByUserId").notNull(), assignedToUserId: int("assignedToUserId").notNull(), assignmentType: mysqlEnum("assignmentType", ["assigned", "reassigned"]).notNull(), note: varchar("note", { length: 500 }), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_case_assignments_case_created_index").on(table.caseId, table.createdAt), index("admin_case_assignments_assignee_created_index").on(table.assignedToUserId, table.createdAt)]);

/** Escalation records make SLA risk and breach visible in the Admin dashboard without invoking external notification providers. */
export const adminCaseEscalations = mysqlTable("admin_case_escalations", {
  id: int("id").autoincrement().primaryKey(), caseId: int("caseId").notNull(), severity: mysqlEnum("severity", ["at_risk", "breached"]).notNull(), triggeredAt: timestamp("triggeredAt").defaultNow().notNull(), acknowledgedByUserId: int("acknowledgedByUserId"), acknowledgedAt: timestamp("acknowledgedAt"),
}, (table) => [uniqueIndex("admin_case_escalations_case_severity_unique").on(table.caseId, table.severity), index("admin_case_escalations_acknowledged_triggered_index").on(table.acknowledgedAt, table.triggeredAt)]);

/** Advisory model outputs are retained for review. They cannot change a report, case, Business, order, or financial record. */
export const adminAiTriageAssessments = mysqlTable("admin_ai_triage_assessments", {
  id: int("id").autoincrement().primaryKey(), subjectType: mysqlEnum("subjectType", ["photo_report", "business_emergency"]).notNull(), subjectId: int("subjectId").notNull(), requestedByUserId: int("requestedByUserId").notNull(), model: varchar("model", { length: 120 }).notNull(), inputSummary: text("inputSummary").notNull(), assessmentSummary: varchar("assessmentSummary", { length: 1000 }).notNull(), confidenceBps: int("confidenceBps").notNull(), recommendedPriority: mysqlEnum("recommendedPriority", ["normal", "high", "critical"]).notNull(), suggestedDisposition: mysqlEnum("suggestedDisposition", ["retain_for_human_review", "prioritize_review", "additional_evidence_needed"]).notNull(), safetySignalsJson: text("safetySignalsJson").notNull(), reviewState: mysqlEnum("reviewState", ["pending_human_review", "acknowledged", "overridden"]).default("pending_human_review").notNull(), humanReviewedByUserId: int("humanReviewedByUserId"), humanReviewedAt: timestamp("humanReviewedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_ai_triage_subject_created_index").on(table.subjectType, table.subjectId, table.createdAt), index("admin_ai_triage_review_state_created_index").on(table.reviewState, table.createdAt)]);

/** Human quality labels close the learning loop without retraining or changing live model behavior automatically. */
export const adminAiTriageFeedback = mysqlTable("admin_ai_triage_feedback", {
  id: int("id").autoincrement().primaryKey(), assessmentId: int("assessmentId").notNull(), submittedByUserId: int("submittedByUserId").notNull(), outcome: mysqlEnum("outcome", ["confirmed_accurate", "false_positive", "false_negative", "needs_more_evidence"]).notNull(), note: varchar("note", { length: 1000 }), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_ai_triage_feedback_assessment_created_index").on(table.assessmentId, table.createdAt), index("admin_ai_triage_feedback_outcome_created_index").on(table.outcome, table.createdAt)]);

/** Encrypted TOTP material is held server-side; raw shared secrets are shown only during enrollment. */
export const adminMfaEnrollments = mysqlTable("admin_mfa_enrollments", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), secretCiphertext: text("secretCiphertext").notNull(), status: mysqlEnum("status", ["pending", "active", "disabled"]).default("pending").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), confirmedAt: timestamp("confirmedAt"), disabledAt: timestamp("disabledAt"),
}, (table) => [uniqueIndex("admin_mfa_enrollment_user_unique").on(table.userId), index("admin_mfa_enrollment_status_created_index").on(table.status, table.createdAt)]);

/** One-time recovery codes are stored only as hashes and can never be reconstructed. */
export const adminMfaRecoveryCodes = mysqlTable("admin_mfa_recovery_codes", {
  id: int("id").autoincrement().primaryKey(), enrollmentId: int("enrollmentId").notNull(), codeHash: varchar("codeHash", { length: 128 }).notNull(), usedAt: timestamp("usedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_mfa_recovery_enrollment_used_index").on(table.enrollmentId, table.usedAt), uniqueIndex("admin_mfa_recovery_hash_unique").on(table.codeHash)]);

/** Opaque, browser-bound MFA sessions sit in front of the long-lived platform OAuth session. */
export const adminWebSessions = mysqlTable("admin_web_sessions", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), tokenHash: varchar("tokenHash", { length: 128 }).notNull(), ipAddress: varchar("ipAddress", { length: 64 }).notNull(), host: varchar("host", { length: 255 }).notNull(), userAgent: varchar("userAgent", { length: 500 }), mfaVerifiedAt: timestamp("mfaVerifiedAt").notNull(), lastSeenAt: timestamp("lastSeenAt").notNull(), expiresAt: timestamp("expiresAt").notNull(), revokedAt: timestamp("revokedAt"), revokedByUserId: int("revokedByUserId"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("admin_web_sessions_token_unique").on(table.tokenHash), index("admin_web_sessions_user_expiry_index").on(table.userId, table.expiresAt), index("admin_web_sessions_active_expiry_index").on(table.revokedAt, table.expiresAt)]);

/** Security-relevant authentication decisions are retained independently from general operational audit events. */
export const adminWebLoginAttempts = mysqlTable("admin_web_login_attempts", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId"), eventType: mysqlEnum("eventType", ["oauth_authenticated", "mfa_enrollment_started", "mfa_enrollment_confirmed", "mfa_succeeded", "mfa_failed", "recovery_code_used", "ip_denied", "host_denied", "session_revoked"]).notNull(), success: boolean("success").notNull(), ipAddress: varchar("ipAddress", { length: 64 }).notNull(), host: varchar("host", { length: 255 }).notNull(), userAgent: varchar("userAgent", { length: 500 }), reason: varchar("reason", { length: 500 }), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_web_login_user_created_index").on(table.userId, table.createdAt), index("admin_web_login_event_created_index").on(table.eventType, table.createdAt)]);

/** Delivery state prevents repeated security failures from flooding the designated alert channel. */
export const adminWebSecurityAlerts = mysqlTable("admin_web_security_alerts", {
  id: int("id").autoincrement().primaryKey(), alertType: mysqlEnum("alertType", ["repeated_mfa_failures", "repeated_ip_denials"]).notNull(), scopeKey: varchar("scopeKey", { length: 160 }).notNull(), lastEventCount: int("lastEventCount").notNull(), lastDeliveredAt: timestamp("lastDeliveredAt").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("admin_web_security_alert_scope_unique").on(table.alertType, table.scopeKey), index("admin_web_security_alert_delivered_index").on(table.lastDeliveredAt)]);

/** Staff credentials are separate from marketplace identities and store only salted password hashes. */
export const adminStaffCredentials = mysqlTable("admin_staff_credentials", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), username: varchar("username", { length: 80 }).notNull(), passwordHash: varchar("passwordHash", { length: 255 }).notNull(), status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(), passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(), createdByUserId: int("createdByUserId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("admin_staff_credentials_user_unique").on(table.userId), uniqueIndex("admin_staff_credentials_username_unique").on(table.username), index("admin_staff_credentials_status_index").on(table.status)]);

/** Short-lived opaque credential sessions are valid only until the Admin MFA challenge succeeds. */
export const adminCredentialSessions = mysqlTable("admin_credential_sessions", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), tokenHash: varchar("tokenHash", { length: 128 }).notNull(), ipAddress: varchar("ipAddress", { length: 64 }).notNull(), host: varchar("host", { length: 255 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), revokedAt: timestamp("revokedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("admin_credential_sessions_token_unique").on(table.tokenHash), index("admin_credential_sessions_user_expiry_index").on(table.userId, table.expiresAt)]);

/** Persisted credential attempts support rate limits without reusing MFA or marketplace audit categories. */
export const adminCredentialLoginAttempts = mysqlTable("admin_credential_login_attempts", {
  id: int("id").autoincrement().primaryKey(), username: varchar("username", { length: 80 }).notNull(), ipAddress: varchar("ipAddress", { length: 64 }).notNull(), success: boolean("success").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("admin_credential_login_username_created_index").on(table.username, table.createdAt), index("admin_credential_login_ip_created_index").on(table.ipAddress, table.createdAt)]);

/** A non-empty active ruleset enables default-deny IPv4 CIDR allowlisting for the web-only Admin console. */
export const adminIpAllowlist = mysqlTable("admin_ip_allowlist", {
  id: int("id").autoincrement().primaryKey(), cidr: varchar("cidr", { length: 64 }).notNull(), label: varchar("label", { length: 120 }).notNull(), status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(), createdByUserId: int("createdByUserId").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("admin_ip_allowlist_cidr_unique").on(table.cidr), index("admin_ip_allowlist_status_created_index").on(table.status, table.createdAt)]);

/** Restaurant KDS acknowledgement is distinct from acceptance so new-order alerts can be safely dismissed without altering the order state. */
export const orderKitchenAcknowledgements = mysqlTable("order_kitchen_acknowledgements", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  acknowledgedByUserId: int("acknowledgedByUserId").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("order_kitchen_acknowledgements_order_unique").on(table.orderId)]);

export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(), customerUserId: int("customerUserId").notNull(), orderId: int("orderId"), category: mysqlEnum("category", ["order", "delivery", "payment", "account", "other"]).notNull(), subject: varchar("subject", { length: 140 }).notNull(), message: varchar("message", { length: 1500 }).notNull(), status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("support_tickets_customer_created_index").on(table.customerUserId, table.createdAt), index("support_tickets_status_created_index").on(table.status, table.createdAt)]);

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), orderUpdatesEnabled: boolean("orderUpdatesEnabled").default(true).notNull(), supportUpdatesEnabled: boolean("supportUpdatesEnabled").default(true).notNull(), promotionsEnabled: boolean("promotionsEnabled").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("notification_preferences_user_unique").on(table.userId)]);

/** Durable server receipt for an authenticated Rider command. Client-side pending records are replayed with the same idempotency key after connectivity returns. */
export const riderCommandReceipts = mysqlTable("rider_command_receipts", {
  id: int("id").autoincrement().primaryKey(), riderUserId: int("riderUserId").notNull(), orderId: int("orderId"), commandType: mysqlEnum("commandType", ["offer_decision", "transition", "cod_collection", "location_update", "availability"]).notNull(), idempotencyKey: varchar("idempotencyKey", { length: 120 }).notNull(), payloadJson: text("payloadJson").notNull(), status: mysqlEnum("status", ["processing", "succeeded", "failed", "rejected"]).default("processing").notNull(), attempts: int("attempts").default(1).notNull(), resultJson: text("resultJson"), errorCode: varchar("errorCode", { length: 80 }), errorMessage: varchar("errorMessage", { length: 500 }), receivedAt: timestamp("receivedAt").defaultNow().notNull(), processedAt: timestamp("processedAt"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("rider_command_receipts_rider_key_unique").on(table.riderUserId, table.idempotencyKey), index("rider_command_receipts_rider_status_index").on(table.riderUserId, table.status, table.receivedAt), index("rider_command_receipts_order_index").on(table.orderId, table.receivedAt)]);

/** Registered native device endpoints. A token never authorizes access; it is only a delivery address owned by the authenticated user. */
export const notificationDeviceTokens = mysqlTable("notification_device_tokens", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), provider: mysqlEnum("provider", ["expo"]).default("expo").notNull(), token: varchar("token", { length: 255 }).notNull(), platform: mysqlEnum("platform", ["ios", "android"]).notNull(), status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(), lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(), disabledAt: timestamp("disabledAt"), failureReason: varchar("failureReason", { length: 500 }), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("notification_device_tokens_token_unique").on(table.token), index("notification_device_tokens_user_status_index").on(table.userId, table.status, table.lastSeenAt)]);

/** The durable in-app source of truth; sender and provider delivery attempts are separate from a user’s ability to read their notification later. */
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(), recipientUserId: int("recipientUserId").notNull(), category: mysqlEnum("category", ["order", "rider_offer", "support", "finance", "system"]).notNull(), title: varchar("title", { length: 160 }).notNull(), body: varchar("body", { length: 500 }).notNull(), route: varchar("route", { length: 255 }), orderId: int("orderId"), supportTicketId: int("supportTicketId"), deduplicationKey: varchar("deduplicationKey", { length: 180 }).notNull(), readAt: timestamp("readAt"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("user_notifications_dedupe_unique").on(table.deduplicationKey), index("user_notifications_recipient_read_created_index").on(table.recipientUserId, table.readAt, table.createdAt), index("user_notifications_order_created_index").on(table.orderId, table.createdAt)]);

/** Delivery attempts are retained independently per channel and device. Pending Expo attempts may be replayed after a transient provider failure. */
export const notificationDeliveries = mysqlTable("notification_deliveries", {
  id: int("id").autoincrement().primaryKey(), notificationId: int("notificationId").notNull(), deviceTokenId: int("deviceTokenId"), channel: mysqlEnum("channel", ["in_app", "expo_push"]).notNull(), status: mysqlEnum("status", ["queued", "delivered", "failed", "suppressed"]).default("queued").notNull(), attempts: int("attempts").default(0).notNull(), providerMessageId: varchar("providerMessageId", { length: 160 }), lastError: varchar("lastError", { length: 500 }), nextAttemptAt: timestamp("nextAttemptAt"), deliveredAt: timestamp("deliveredAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("notification_delivery_channel_device_unique").on(table.notificationId, table.channel, table.deviceTokenId), index("notification_deliveries_pending_index").on(table.channel, table.status, table.nextAttemptAt, table.createdAt)]);

/** One support conversation can stay tied to a customer-owned order while retaining an auditable distinction between customer, staff, and system messages. */
export const supportTicketMessages = mysqlTable("support_ticket_messages", {
  id: int("id").autoincrement().primaryKey(), ticketId: int("ticketId").notNull(), authorUserId: int("authorUserId"), authorType: mysqlEnum("authorType", ["customer", "admin", "system"]).notNull(), visibility: mysqlEnum("visibility", ["customer_visible", "internal"]).default("customer_visible").notNull(), body: varchar("body", { length: 2000 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("support_ticket_messages_ticket_created_index").on(table.ticketId, table.createdAt), index("support_ticket_messages_author_created_index").on(table.authorUserId, table.createdAt)]);

/** Server-authoritative financial facts. Amounts are signed only when an adjustment reverses a position; no gateway settlement is implied by a record. */
export const paymentLedgerEntries = mysqlTable("payment_ledger_entries", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), organisationId: int("organisationId").notNull(), riderUserId: int("riderUserId"), refundRequestId: int("refundRequestId"), partyType: mysqlEnum("partyType", ["customer", "business", "rider", "platform"]).notNull(), entryType: mysqlEnum("entryType", ["order_total_due", "cash_collected", "business_payable", "platform_commission", "rider_cash_custody", "refund_requested", "refund_approved", "refund_settled", "refund_rejected"]).notNull(), amountMinor: int("amountMinor").notNull(), status: mysqlEnum("status", ["pending", "approved", "settled", "failed", "void"]).default("pending").notNull(), reference: varchar("reference", { length: 180 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("payment_ledger_entries_reference_unique").on(table.reference), index("payment_ledger_business_status_created_index").on(table.organisationId, table.partyType, table.status, table.createdAt), index("payment_ledger_rider_status_created_index").on(table.riderUserId, table.partyType, table.status, table.createdAt), index("payment_ledger_order_created_index").on(table.orderId, table.createdAt)]);

/** Customer-requested refunds await a role-scoped finance decision and explicit settlement confirmation; they never trigger a gateway payment automatically. */
export const refundRequests = mysqlTable("refund_requests", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), supportTicketId: int("supportTicketId").notNull(), customerUserId: int("customerUserId").notNull(), requestedMinor: int("requestedMinor").notNull(), reason: varchar("reason", { length: 1000 }).notNull(), status: mysqlEnum("status", ["requested", "approved", "settled", "rejected", "cancelled"]).default("requested").notNull(), reviewedByUserId: int("reviewedByUserId"), reviewedAt: timestamp("reviewedAt"), settledByUserId: int("settledByUserId"), settledAt: timestamp("settledAt"), decisionNote: varchar("decisionNote", { length: 1000 }), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("refund_requests_customer_created_index").on(table.customerUserId, table.createdAt), index("refund_requests_order_status_index").on(table.orderId, table.status), index("refund_requests_status_created_index").on(table.status, table.createdAt)]);

/** A deterministic dispatch score snapshot records the exact factors used for each eligible Rider recommendation. */
export const dispatchScoreSnapshots = mysqlTable("dispatch_score_snapshots", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), riderUserId: int("riderUserId").notNull(), score: int("score").notNull(), activeWorkload: int("activeWorkload").notNull(), availabilityAgeSeconds: int("availabilityAgeSeconds").notNull(), eligibility: mysqlEnum("eligibility", ["eligible", "ineligible"]).notNull(), explanationJson: text("explanationJson").notNull(), computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("dispatch_score_order_rider_unique").on(table.orderId, table.riderUserId), index("dispatch_score_order_rank_index").on(table.orderId, table.eligibility, table.score)]);

/** A Rider may share location only during one assigned delivery session; ending this record prevents further location ingestion. */
export const riderTrackingSessions = mysqlTable("rider_tracking_sessions", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  riderUserId: int("riderUserId").notNull(),
  status: mysqlEnum("status", ["active", "paused", "ended"]).default("active").notNull(),
  consentGrantedAt: timestamp("consentGrantedAt").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  pausedAt: timestamp("pausedAt"),
  endedAt: timestamp("endedAt"),
  endedReason: mysqlEnum("endedReason", ["delivery_completed", "order_cancelled", "rider_paused", "rider_stopped", "session_replaced"]),
  lastLocationAt: timestamp("lastLocationAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("rider_tracking_sessions_order_unique").on(table.orderId),
  index("rider_tracking_sessions_rider_status_index").on(table.riderUserId, table.status, table.updatedAt),
]);

/** Append-only, foreground rider position updates; only the freshest active-delivery point is shown to a customer. */
export const riderLocationUpdates = mysqlTable("rider_location_updates", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  riderUserId: int("riderUserId").notNull(),
  latitudeE6: int("latitudeE6").notNull(),
  longitudeE6: int("longitudeE6").notNull(),
  accuracyMeters: int("accuracyMeters"),
  source: mysqlEnum("source", ["foreground", "background"]).default("foreground").notNull(),
  deviceObservedAt: timestamp("deviceObservedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("rider_location_updates_order_created_index").on(table.orderId, table.createdAt), index("rider_location_updates_rider_created_index").on(table.riderUserId, table.createdAt)]);

/** Cached route/ETA facts are advisory and provider-independent; they never alter an order price or financial ledger. */
export const deliveryRouteSnapshots = mysqlTable("delivery_route_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  status: mysqlEnum("status", ["estimated", "provider_unavailable", "failed"]).default("estimated").notNull(),
  distanceMeters: int("distanceMeters"),
  durationSeconds: int("durationSeconds"),
  etaMinutes: int("etaMinutes"),
  provider: varchar("provider", { length: 80 }).notNull(),
  routeRevision: varchar("routeRevision", { length: 100 }).notNull(),
  responseMetadataJson: varchar("responseMetadataJson", { length: 2_000 }).notNull().default("{}"),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("delivery_route_snapshots_order_revision_unique").on(table.orderId, table.routeRevision),
  index("delivery_route_snapshots_order_computed_index").on(table.orderId, table.computedAt),
]);

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
export type RiderTrackingSession = typeof riderTrackingSessions.$inferSelect;
export type RiderLocationUpdate = typeof riderLocationUpdates.$inferSelect;
export type DeliveryRouteSnapshot = typeof deliveryRouteSnapshots.$inferSelect;
