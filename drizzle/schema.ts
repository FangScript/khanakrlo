import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import {
  BUSINESS_TYPES,
  WORKSPACE_APPLICATION_STATUSES,
  WORKSPACE_APPLICATION_TYPES,
  WORKSPACE_MEMBERSHIP_STATUSES,
  WORKSPACE_TYPES,
} from "../shared/workspace";
import {
  BUSINESS_CHECKLIST_STATUSES,
  BUSINESS_DOCUMENT_STATUSES,
  BUSINESS_DOCUMENT_TYPES,
  BUSINESS_OPERATIONAL_STATUSES,
  BUSINESS_SCOPE_TYPES,
  BUSINESS_STAFF_ROLES,
} from "../shared/business";
import { ORDER_PAYMENT_METHODS, ORDER_PAYMENT_STATUSES, ORDER_STATUSES } from "../shared/order";

export {
  BUSINESS_TYPES,
  WORKSPACE_APPLICATION_STATUSES,
  WORKSPACE_APPLICATION_TYPES,
  WORKSPACE_MEMBERSHIP_STATUSES,
  WORKSPACE_TYPES,
} from "../shared/workspace";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const workspaceTypeEnum = pgEnum("workspaceType", WORKSPACE_TYPES);
export const workspaceMembershipStatusEnum = pgEnum("workspace_membership_status", WORKSPACE_MEMBERSHIP_STATUSES);
export const workspaceApplicationTypeEnum = pgEnum("workspaceApplicationType", WORKSPACE_APPLICATION_TYPES);
export const workspaceApplicationStatusEnum = pgEnum("workspace_application_status", WORKSPACE_APPLICATION_STATUSES);
export const businessTypeEnum = pgEnum("businessType", BUSINESS_TYPES);
export const businessOperationalStatusEnum = pgEnum("business_operational_status", BUSINESS_OPERATIONAL_STATUSES);
export const businessScopeTypeEnum = pgEnum("business_scope_type", BUSINESS_SCOPE_TYPES);
export const businessDocumentTypeEnum = pgEnum("business_document_type", BUSINESS_DOCUMENT_TYPES);
export const businessDocumentStatusEnum = pgEnum("business_document_status", BUSINESS_DOCUMENT_STATUSES);
export const businessChecklistStatusEnum = pgEnum("business_checklist_status", BUSINESS_CHECKLIST_STATUSES);
export const businessStaffRoleEnum = pgEnum("business_staff_role", BUSINESS_STAFF_ROLES);
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const orderPaymentMethodEnum = pgEnum("order_payment_method", ORDER_PAYMENT_METHODS);
export const orderPaymentStatusEnum = pgEnum("order_payment_status", ORDER_PAYMENT_STATUSES);
export const geocodeSourceEnum = pgEnum("geocode_source", ["device", "manual"]);
export const revenueBaseEnum = pgEnum("revenue_base", ["item_subtotal_after_discount"]);
export const settlementStatusEnum = pgEnum("settlement_status", ["unsettled", "reconciled", "variance", "waived"]);
export const codStatusEnum = pgEnum("cod_status", ["collected", "short", "over"]);
export const settlementPartyTypeEnum = pgEnum("settlement_party_type", ["platform", "restaurant", "rider"]);
export const settlementEntryTypeEnum = pgEnum("settlement_entry_type", ["commission", "restaurant_payable", "rider_cash_custody", "collection_variance"]);
export const settlementEntryStatusEnum = pgEnum("settlement_entry_status", ["open", "reconciled", "void"]);
export const reviewVisibilityEnum = pgEnum("review_visibility", ["published", "hidden"]);
export const reviewPhotoPrivacyEnum = pgEnum("review_photo_privacy", ["public", "business_only", "platform_only"]);
export const reviewPhotoReportReasonEnum = pgEnum("review_photo_report_reason", ["nudity", "hate_or_harassment", "violence", "spam", "other"]);
export const reviewPhotoReportStatusEnum = pgEnum("review_photo_report_status", ["open", "resolved", "dismissed"]);
export const riderOfferStatusEnum = pgEnum("rider_offer_status", ["offered", "accepted", "declined", "expired"]);
export const riderOnlineStatusEnum = pgEnum("rider_online_status", ["online", "offline"]);
export const riderCashAccountStatusEnum = pgEnum("rider_cash_account_status", ["active", "restricted", "suspended"]);
export const riderCashEntryTypeEnum = pgEnum("rider_cash_entry_type", ["commission_reserved", "commission_released", "cash_collected", "cash_variance", "settlement_adjustment"]);
export const adminStaffRoleTypeEnum = pgEnum("admin_staff_role_type", ["support_agent", "moderation_agent", "finance_operator", "senior_operations"]);
export const adminStaffStatusEnum = pgEnum("admin_staff_status", ["active", "inactive"]);
export const adminStaffActionEnum = pgEnum("admin_staff_action", ["provisioned", "delegated", "deactivated", "reactivated"]);
export const adminCaseTypeEnum = pgEnum("admin_case_type", ["business_emergency", "rider_remittance"]);
export const adminCaseStatusEnum = pgEnum("admin_case_status", ["open", "in_progress", "resolved", "dismissed"]);
export const adminCasePriorityEnum = pgEnum("admin_case_priority", ["normal", "high", "critical"]);
export const adminCaseAssignmentTypeEnum = pgEnum("admin_case_assignment_type", ["assigned", "reassigned"]);
export const adminCaseEscalationSeverityEnum = pgEnum("admin_case_escalation_severity", ["at_risk", "breached"]);
export const adminAiSubjectTypeEnum = pgEnum("admin_ai_subject_type", ["photo_report", "business_emergency"]);
export const adminAiReviewStateEnum = pgEnum("admin_ai_review_state", ["pending_human_review", "acknowledged", "overridden"]);
export const adminAiRecommendedPriorityEnum = pgEnum("admin_ai_recommended_priority", ["normal", "high", "critical"]);
export const adminAiDispositionEnum = pgEnum("admin_ai_disposition", ["retain_for_human_review", "prioritize_review", "additional_evidence_needed"]);
export const adminAiFeedbackOutcomeEnum = pgEnum("admin_ai_feedback_outcome", ["confirmed_accurate", "false_positive", "false_negative", "needs_more_evidence"]);
export const adminMfaStatusEnum = pgEnum("admin_mfa_status", ["pending", "active", "disabled"]);
export const adminWebLoginEventTypeEnum = pgEnum("admin_web_login_event_type", ["oauth_authenticated", "mfa_enrollment_started", "mfa_enrollment_confirmed", "mfa_succeeded", "mfa_failed", "recovery_code_used", "ip_denied", "host_denied", "session_revoked"]);
export const adminAlertTypeEnum = pgEnum("admin_alert_type", ["repeated_mfa_failures", "repeated_ip_denials"]);
export const adminCredentialStatusEnum = pgEnum("admin_credential_status", ["active", "disabled"]);
export const adminIpAllowlistStatusEnum = pgEnum("admin_ip_allowlist_status", ["active", "disabled"]);
export const supportCategoryEnum = pgEnum("support_category", ["order", "delivery", "payment", "account", "other"]);
export const supportStatusEnum = pgEnum("support_status", ["open", "in_progress", "resolved", "closed"]);
export const supportAuthorTypeEnum = pgEnum("support_author_type", ["customer", "admin", "system"]);
export const supportVisibilityEnum = pgEnum("support_visibility", ["customer_visible", "internal"]);
export const notificationCategoryEnum = pgEnum("notification_category", ["order", "rider_offer", "support", "finance", "system"]);
export const notificationProviderEnum = pgEnum("notification_provider", ["expo"]);
export const notificationPlatformEnum = pgEnum("notification_platform", ["ios", "android"]);
export const notificationStatusEnum = pgEnum("notification_status", ["active", "disabled"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "expo_push"]);
export const notificationDeliveryStatusEnum = pgEnum("notification_delivery_status", ["queued", "delivered", "failed", "suppressed"]);
export const riderTrackingStatusEnum = pgEnum("rider_tracking_status", ["active", "paused", "ended"]);
export const riderTrackingEndReasonEnum = pgEnum("rider_tracking_end_reason", ["delivery_completed", "order_cancelled", "rider_paused", "rider_stopped", "session_replaced"]);
export const riderLocationSourceEnum = pgEnum("rider_location_source", ["foreground", "background"]);
export const deliveryRouteStatusEnum = pgEnum("delivery_route_status", ["estimated", "provider_unavailable", "failed"]);
export const dispatchEligibilityEnum = pgEnum("dispatch_eligibility", ["eligible", "ineligible"]);
export const riderCommandTypeEnum = pgEnum("rider_command_type", ["offer_decision", "transition", "cod_collection", "location_update", "availability"]);
export const riderCommandStatusEnum = pgEnum("rider_command_status", ["processing", "succeeded", "failed", "rejected"]);
export const paymentPartyTypeEnum = pgEnum("payment_party_type", ["customer", "business", "rider", "platform"]);
export const paymentEntryTypeEnum = pgEnum("payment_entry_type", ["order_total_due", "cash_collected", "business_payable", "platform_commission", "rider_cash_custody", "refund_requested", "refund_approved", "refund_settled", "refund_rejected"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "settled", "failed", "void"]);
export const refundStatusEnum = pgEnum("refund_status", ["requested", "approved", "settled", "rejected", "cancelled"]);
export const outboxDomainEnum = pgEnum("outbox_domain", ["business-onboarding", "admin", "orders", "riders", "notifications"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * Core identity record created by the platform OAuth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Customer-facing profile data.
 */
export const accountProfiles = pgTable("account_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  givenName: varchar("givenName", { length: 100 }),
  phoneE164: varchar("phoneE164", { length: 20 }),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  defaultCity: varchar("defaultCity", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("account_profiles_user_unique").on(table.userId),
  uniqueIndex("account_profiles_phone_unique").on(table.phoneE164),
]);

export const customerAddresses = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  recipientName: varchar("recipientName", { length: 160 }).notNull(),
  phoneE164: varchar("phoneE164", { length: 20 }).notNull(),
  addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 120 }).notNull(),
  instructions: varchar("instructions", { length: 500 }),
  latitudeE6: integer("latitudeE6").notNull(),
  longitudeE6: integer("longitudeE6").notNull(),
  geocodeSource: geocodeSourceEnum("geocodeSource").default("device").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("customer_addresses_user_index").on(table.userId, table.archivedAt),
  index("customer_addresses_coordinates_index").on(table.city, table.latitudeE6, table.longitudeE6),
]);

/**
 * A workspace is an approved role context inside the single app.
 */
export const workspaceMemberships = pgTable("workspace_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  workspaceType: workspaceTypeEnum("workspaceType").notNull(),
  status: workspaceMembershipStatusEnum("status").default("active").notNull(),
  applicationId: integer("applicationId"),
  approvedAt: timestamp("approvedAt"),
  suspendedAt: timestamp("suspendedAt"),
  suspensionReason: varchar("suspensionReason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_memberships_user_workspace_unique").on(table.userId, table.workspaceType),
  index("workspace_memberships_user_index").on(table.userId),
  index("workspace_memberships_status_index").on(table.workspaceType, table.status),
]);

/**
 * Approval workflow for Business and Rider workspaces.
 */
export const workspaceApplications = pgTable("workspace_applications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  workspaceType: workspaceApplicationTypeEnum("workspaceType").notNull(),
  businessType: businessTypeEnum("businessType"),
  status: workspaceApplicationStatusEnum("status").default("draft").notNull(),
  displayName: varchar("displayName", { length: 160 }),
  phoneE164: varchar("phoneE164", { length: 20 }),
  city: varchar("city", { length: 120 }),
  reviewNote: varchar("reviewNote", { length: 1000 }),
  submittedAt: timestamp("submittedAt"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedByUserId: integer("reviewedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_applications_user_workspace_unique").on(table.userId, table.workspaceType),
  index("workspace_applications_status_index").on(table.workspaceType, table.status),
  index("workspace_applications_reviewer_index").on(table.reviewedByUserId),
]);

/**
 * Append-only compliance and operations trail.
 */
export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId"),
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
 * Transactional outbox for cross-domain events.
 */
export const domainOutboxEvents = pgTable("domain_outbox_events", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 80 }).notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  aggregateType: varchar("aggregateType", { length: 80 }).notNull(),
  aggregateId: varchar("aggregateId", { length: 80 }).notNull(),
  payload: text("payload").notNull(),
  deduplicationKey: varchar("deduplicationKey", { length: 180 }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("lastError"),
  nextAttemptAt: timestamp("nextAttemptAt"),
  processedAt: timestamp("processedAt"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("domain_outbox_events_dedupe_unique").on(table.deduplicationKey),
  index("domain_outbox_events_pending_index").on(table.domain, table.processedAt, table.nextAttemptAt, table.occurredAt),
  index("domain_outbox_events_aggregate_index").on(table.aggregateType, table.aggregateId),
]);

export const businessApplicationDetails = pgTable("business_application_details", {
  id: serial("id").primaryKey(),
  applicationId: integer("applicationId").notNull(),
  legalName: varchar("legalName", { length: 180 }),
  displayName: varchar("displayName", { length: 160 }),
  supportPhone: varchar("supportPhone", { length: 20 }),
  city: varchar("city", { length: 120 }),
  addressLine1: varchar("addressLine1", { length: 255 }),
  description: text("description"),
  pickupInstructions: varchar("pickupInstructions", { length: 500 }),
  prepTimeMinutes: integer("prepTimeMinutes"),
  openingTime: varchar("openingTime", { length: 5 }),
  closingTime: varchar("closingTime", { length: 5 }),
  cuisine: varchar("cuisine", { length: 120 }),
  cloudKitchenPayload: text("cloudKitchenPayload"),
  serviceZonePayload: text("serviceZonePayload"),
  menuPayload: text("menuPayload"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("business_application_details_application_unique").on(table.applicationId),
]);

export const businessOrganisations = pgTable("business_organisations", {
  id: serial("id").primaryKey(),
  applicationId: integer("applicationId").notNull(),
  ownerUserId: integer("ownerUserId").notNull(),
  businessType: businessTypeEnum("businessType").notNull(),
  legalName: varchar("legalName", { length: 180 }).notNull(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  supportPhone: varchar("supportPhone", { length: 20 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  status: businessOperationalStatusEnum("status").default("approved").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("business_organisations_application_unique").on(table.applicationId),
  index("business_organisations_owner_index").on(table.ownerUserId),
  index("business_organisations_status_index").on(table.businessType, table.status),
]);

/** Approved commercial terms. Rates are basis points: 1,200 = 12.00%. */
export const businessCommissionPolicies = pgTable("business_commission_policies", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisationId").notNull(),
  commissionRateBps: integer("commissionRateBps").notNull(),
  revenueBase: revenueBaseEnum("revenueBase").default("item_subtotal_after_discount").notNull(),
  taxTreatment: varchar("taxTreatment", { length: 120 }).default("pilot_pending").notNull(),
  settlementCadence: varchar("settlementCadence", { length: 80 }).default("manual_pilot").notNull(),
  effectiveFrom: timestamp("effectiveFrom").defaultNow().notNull(),
  effectiveUntil: timestamp("effectiveUntil"),
  approvedByUserId: integer("approvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("business_commission_policy_active_index").on(table.organisationId, table.effectiveFrom, table.effectiveUntil),
  index("business_commission_policy_approver_index").on(table.approvedByUserId),
]);

export const businessOutlets = pgTable("business_outlets", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  cuisine: varchar("cuisine", { length: 120 }).notNull(),
  description: text("description"),
  addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  latitudeE6: integer("latitudeE6"),
  longitudeE6: integer("longitudeE6"),
  pickupInstructions: varchar("pickupInstructions", { length: 500 }),
  prepTimeMinutes: integer("prepTimeMinutes").notNull(),
  acceptsDelivery: boolean("acceptsDelivery").default(true).notNull(),
  isPaused: boolean("isPaused").default(false).notNull(),
  status: businessOperationalStatusEnum("status").default("approved").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("business_outlets_organisation_index").on(table.organisationId),
  index("business_outlets_status_index").on(table.city, table.status),
]);

export const cloudKitchens = pgTable("cloud_kitchens", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisationId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  pickupInstructions: varchar("pickupInstructions", { length: 500 }),
  capacityLimit: integer("capacityLimit").notNull(),
  activeOrderLimit: integer("activeOrderLimit").notNull(),
  isPaused: boolean("isPaused").default(false).notNull(),
  status: businessOperationalStatusEnum("status").default("approved").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cloud_kitchens_organisation_unique").on(table.organisationId),
  index("cloud_kitchens_status_index").on(table.city, table.status),
]);

export const kitchenBrands = pgTable("kitchen_brands", {
  id: serial("id").primaryKey(),
  cloudKitchenId: integer("cloudKitchenId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  cuisine: varchar("cuisine", { length: 120 }).notNull(),
  description: text("description"),
  prepTimeMinutes: integer("prepTimeMinutes").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("kitchen_brands_kitchen_index").on(table.cloudKitchenId),
]);

export const productionStations = pgTable("production_stations", {
  id: serial("id").primaryKey(),
  cloudKitchenId: integer("cloudKitchenId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  capacityLimit: integer("capacityLimit").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("production_stations_kitchen_index").on(table.cloudKitchenId),
]);

export const serviceZones = pgTable("service_zones", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisationId").notNull(),
  outletId: integer("outletId"),
  cloudKitchenId: integer("cloudKitchenId"),
  name: varchar("name", { length: 120 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  centerLatitudeE6: integer("centerLatitudeE6"),
  centerLongitudeE6: integer("centerLongitudeE6"),
  radiusMeters: integer("radiusMeters"),
  courierBaseMinutes: integer("courierBaseMinutes").default(8).notNull(),
  courierMinutesPerKm: integer("courierMinutesPerKm").default(3).notNull(),
  deliveryFeeMinor: integer("deliveryFeeMinor").default(0).notNull(),
  minimumOrderMinor: integer("minimumOrderMinor").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("service_zones_organisation_index").on(table.organisationId),
  index("service_zones_city_index").on(table.city, table.isActive),
]);

export const businessHours = pgTable("business_hours", {
  id: serial("id").primaryKey(),
  scopeType: businessScopeTypeEnum("scopeType").notNull(),
  scopeId: integer("scopeId").notNull(),
  weekday: integer("weekday").notNull(),
  opensAt: varchar("opensAt", { length: 5 }),
  closesAt: varchar("closesAt", { length: 5 }),
  isClosed: boolean("isClosed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("business_hours_scope_day_unique").on(table.scopeType, table.scopeId, table.weekday),
]);

export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  outletId: integer("outletId"),
  kitchenBrandId: integer("kitchenBrandId"),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  archivedAt: timestamp("archivedAt"),
  archivedByUserId: integer("archivedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("menu_categories_outlet_index").on(table.outletId),
  index("menu_categories_brand_index").on(table.kitchenBrandId),
]);

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  priceMinor: integer("priceMinor").notNull(),
  prepTimeMinutes: integer("prepTimeMinutes").notNull(),
  imageKey: varchar("imageKey", { length: 500 }),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  archivedAt: timestamp("archivedAt"),
  archivedByUserId: integer("archivedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("menu_items_category_index").on(table.categoryId, table.isAvailable),
]);

export const menuModifiers = pgTable("menu_modifiers", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menuItemId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  priceMinor: integer("priceMinor").default(0).notNull(),
  isRequired: boolean("isRequired").default(false).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  archivedAt: timestamp("archivedAt"),
  archivedByUserId: integer("archivedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("menu_modifiers_item_index").on(table.menuItemId, table.isAvailable),
]);

/** Durable order aggregate. Money is always represented in PKR minor units. */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  publicId: varchar("publicId", { length: 40 }).notNull(),
  customerUserId: integer("customerUserId").notNull(),
  organisationId: integer("organisationId").notNull(),
  outletId: integer("outletId"),
  kitchenBrandId: integer("kitchenBrandId"),
  status: orderStatusEnum("status").default("placed").notNull(),
  paymentMethod: orderPaymentMethodEnum("paymentMethod").default("cod").notNull(),
  paymentStatus: orderPaymentStatusEnum("paymentStatus").default("cash_due").notNull(),
  deliveryRecipientName: varchar("deliveryRecipientName", { length: 160 }).notNull(),
  deliveryPhoneE164: varchar("deliveryPhoneE164", { length: 20 }).notNull(),
  deliveryAddressLine1: varchar("deliveryAddressLine1", { length: 255 }).notNull(),
  deliveryAddressLine2: varchar("deliveryAddressLine2", { length: 255 }),
  deliveryCity: varchar("deliveryCity", { length: 120 }).notNull(),
  deliveryInstructions: varchar("deliveryInstructions", { length: 500 }),
  deliveryAddressId: integer("deliveryAddressId"),
  deliveryLatitudeE6: integer("deliveryLatitudeE6"),
  deliveryLongitudeE6: integer("deliveryLongitudeE6"),
  deliveryZoneId: integer("deliveryZoneId"),
  deliveryDistanceMeters: integer("deliveryDistanceMeters"),
  estimatedCourierMinutes: integer("estimatedCourierMinutes"),
  estimatedTotalMinutes: integer("estimatedTotalMinutes"),
  itemSubtotalMinor: integer("itemSubtotalMinor").notNull(),
  deliveryFeeMinor: integer("deliveryFeeMinor").notNull(),
  serviceFeeMinor: integer("serviceFeeMinor").default(0).notNull(),
  discountMinor: integer("discountMinor").default(0).notNull(),
  totalMinor: integer("totalMinor").notNull(),
  commissionPolicyId: integer("commissionPolicyId"),
  commissionRateBps: integer("commissionRateBps").default(0).notNull(),
  commissionableSubtotalMinor: integer("commissionableSubtotalMinor").default(0).notNull(),
  platformCommissionMinor: integer("platformCommissionMinor").default(0).notNull(),
  restaurantPayableMinor: integer("restaurantPayableMinor").default(0).notNull(),
  riderCashCustodyMinor: integer("riderCashCustodyMinor").default(0).notNull(),
  settlementStatus: settlementStatusEnum("settlementStatus").default("unsettled").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull(),
  placedAt: timestamp("placedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("orders_public_id_unique").on(table.publicId),
  uniqueIndex("orders_customer_idempotency_unique").on(table.customerUserId, table.idempotencyKey),
  index("orders_customer_created_index").on(table.customerUserId, table.placedAt),
  index("orders_business_status_index").on(table.organisationId, table.status, table.placedAt),
  index("orders_settlement_status_index").on(table.organisationId, table.settlementStatus, table.placedAt),
]);

/** The Rider explicitly confirms COD collection. */
export const codCollections = pgTable("cod_collections", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  riderUserId: integer("riderUserId").notNull(),
  expectedMinor: integer("expectedMinor").notNull(),
  collectedMinor: integer("collectedMinor").notNull(),
  varianceMinor: integer("varianceMinor").notNull(),
  varianceReason: varchar("varianceReason", { length: 500 }),
  status: codStatusEnum("status").notNull(),
  confirmedAt: timestamp("confirmedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cod_collections_order_unique").on(table.orderId),
  index("cod_collections_rider_confirmed_index").on(table.riderUserId, table.confirmedAt),
]);

/** Immutable double-entry-style commercial positions. */
export const settlementLedgerEntries = pgTable("settlement_ledger_entries", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  organisationId: integer("organisationId").notNull(),
  partyType: settlementPartyTypeEnum("partyType").notNull(),
  entryType: settlementEntryTypeEnum("entryType").notNull(),
  amountMinor: integer("amountMinor").notNull(),
  status: settlementEntryStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("settlement_ledger_order_party_type_unique").on(table.orderId, table.partyType, table.entryType),
  index("settlement_ledger_org_status_index").on(table.organisationId, table.status, table.createdAt),
]);

/** Immutable sold-dish snapshot. */
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  menuItemId: integer("menuItemId"),
  dishName: varchar("dishName", { length: 160 }).notNull(),
  dishDescription: text("dishDescription"),
  dishImageKey: varchar("dishImageKey", { length: 500 }),
  unitPriceMinor: integer("unitPriceMinor").notNull(),
  modifierTotalMinor: integer("modifierTotalMinor").default(0).notNull(),
  lineTotalMinor: integer("lineTotalMinor").notNull(),
  quantity: integer("quantity").notNull(),
  prepTimeMinutes: integer("prepTimeMinutes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("order_items_order_index").on(table.orderId),
]);

/** Immutable selected-modifier snapshot for an order item. */
export const orderItemModifiers = pgTable("order_item_modifiers", {
  id: serial("id").primaryKey(),
  orderItemId: integer("orderItemId").notNull(),
  menuModifierId: integer("menuModifierId"),
  modifierName: varchar("modifierName", { length: 120 }).notNull(),
  unitPriceMinor: integer("unitPriceMinor").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("order_item_modifiers_item_index").on(table.orderItemId),
]);

/** Append-only transition history. */
export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  fromStatus: orderStatusEnum("fromStatus"),
  toStatus: orderStatusEnum("toStatus").notNull(),
  actorUserId: integer("actorUserId"),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("order_status_history_order_index").on(table.orderId, table.createdAt),
]);

/** A customer can submit one verified review only after their order is delivered. */
export const orderReviews = pgTable("order_reviews", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  organisationId: integer("organisationId").notNull(),
  customerUserId: integer("customerUserId").notNull(),
  rating: integer("rating").notNull(),
  publicComment: varchar("publicComment", { length: 1000 }),
  privateFeedback: varchar("privateFeedback", { length: 1000 }),
  feedbackTopicsJson: varchar("feedbackTopicsJson", { length: 500 }).notNull().default("[]"),
  visibility: reviewVisibilityEnum("visibility").default("published").notNull(),
  businessReply: varchar("businessReply", { length: 1000 }),
  businessRepliedAt: timestamp("businessRepliedAt"),
  moderatedByUserId: integer("moderatedByUserId"),
  moderatedAt: timestamp("moderatedAt"),
  moderationNote: varchar("moderationNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("order_reviews_order_unique").on(table.orderId),
  index("order_reviews_organisation_visibility_created_index").on(table.organisationId, table.visibility, table.createdAt),
  index("order_reviews_customer_created_index").on(table.customerUserId, table.createdAt),
]);

/** Images attached to verified reviews. */
export const reviewPhotos = pgTable("review_photos", {
  id: serial("id").primaryKey(),
  reviewId: integer("reviewId").notNull(),
  customerUserId: integer("customerUserId").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 40 }).notNull(),
  byteSize: integer("byteSize").notNull(),
  privacy: reviewPhotoPrivacyEnum("privacy").default("business_only").notNull(),
  removedAt: timestamp("removedAt"),
  removedByUserId: integer("removedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("review_photos_review_privacy_index").on(table.reviewId, table.privacy, table.createdAt),
  index("review_photos_customer_index").on(table.customerUserId, table.createdAt),
]);

/** Customer reports for public review photos. */
export const reviewPhotoReports = pgTable("review_photo_reports", {
  id: serial("id").primaryKey(),
  photoId: integer("photoId").notNull(),
  reporterUserId: integer("reporterUserId").notNull(),
  reason: reviewPhotoReportReasonEnum("reason").notNull(),
  details: varchar("details", { length: 500 }),
  status: reviewPhotoReportStatusEnum("status").default("open").notNull(),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("review_photo_reports_photo_reporter_index").on(table.photoId, table.reporterUserId, table.status),
  index("review_photo_reports_status_created_index").on(table.status, table.createdAt),
]);

/** One authoritative manual-dispatch assignment per order. */
export const riderAssignments = pgTable("rider_assignments", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  riderUserId: integer("riderUserId").notNull(),
  assignedByUserId: integer("assignedByUserId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  offerStatus: riderOfferStatusEnum("offerStatus").default("accepted").notNull(),
  offerExpiresAt: timestamp("offerExpiresAt"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("rider_assignments_order_unique").on(table.orderId),
  index("rider_assignments_rider_status_index").on(table.riderUserId, table.assignedAt),
]);

/** Current dispatch eligibility for an active Rider. */
export const riderAvailability = pgTable("rider_availability", {
  id: serial("id").primaryKey(),
  riderUserId: integer("riderUserId").notNull(),
  status: riderOnlineStatusEnum("status").default("offline").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("rider_availability_rider_unique").on(table.riderUserId),
  index("rider_availability_status_updated_index").on(table.status, table.updatedAt),
]);

/** Controlled-pilot Rider balance. */
export const riderCashAccounts = pgTable("rider_cash_accounts", {
  id: serial("id").primaryKey(),
  riderUserId: integer("riderUserId").notNull(),
  balanceMinor: integer("balanceMinor").default(0).notNull(),
  status: riderCashAccountStatusEnum("status").default("active").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("rider_cash_accounts_rider_unique").on(table.riderUserId),
]);

export const riderCashAccountEntries = pgTable("rider_cash_account_entries", {
  id: serial("id").primaryKey(),
  riderCashAccountId: integer("riderCashAccountId").notNull(),
  riderUserId: integer("riderUserId").notNull(),
  orderId: integer("orderId"),
  entryType: riderCashEntryTypeEnum("entryType").notNull(),
  amountMinor: integer("amountMinor").notNull(),
  balanceAfterMinor: integer("balanceAfterMinor").notNull(),
  reference: varchar("reference", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("rider_cash_entries_order_type_unique").on(table.orderId, table.entryType),
  index("rider_cash_entries_rider_created_index").on(table.riderUserId, table.createdAt),
]);

/** Immutable Rider remittance receipt data. */
export const riderCashSettlementReceipts = pgTable("rider_cash_settlement_receipts", {
  id: serial("id").primaryKey(),
  riderUserId: integer("riderUserId").notNull(),
  riderCashAccountId: integer("riderCashAccountId").notNull(),
  cashAccountEntryId: integer("cashAccountEntryId").notNull(),
  receiptCode: varchar("receiptCode", { length: 80 }).notNull(),
  amountMinor: integer("amountMinor").notNull(),
  balanceAfterMinor: integer("balanceAfterMinor").notNull(),
  reconciledOrderIdsJson: text("reconciledOrderIdsJson").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("rider_cash_receipts_code_unique").on(table.receiptCode),
  uniqueIndex("rider_cash_receipts_entry_unique").on(table.cashAccountEntryId),
  index("rider_cash_receipts_rider_issued_index").on(table.riderUserId, table.issuedAt),
]);

/** Internal staff permissions. */
export const adminStaffRoles = pgTable("admin_staff_roles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  staffRole: adminStaffRoleTypeEnum("staffRole").notNull(),
  status: adminStaffStatusEnum("status").default("active").notNull(),
  grantedByUserId: integer("grantedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_staff_roles_user_unique").on(table.userId),
  index("admin_staff_roles_role_status_index").on(table.staffRole, table.status),
]);

/** Append-only evidence of delegation decisions. */
export const adminStaffRoleEvents = pgTable("admin_staff_role_events", {
  id: serial("id").primaryKey(),
  targetUserId: integer("targetUserId").notNull(),
  actorUserId: integer("actorUserId").notNull(),
  previousRole: adminStaffRoleTypeEnum("previousRole"),
  nextRole: adminStaffRoleTypeEnum("nextRole"),
  action: adminStaffActionEnum("action").notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("admin_staff_role_events_target_created_index").on(table.targetUserId, table.createdAt),
  index("admin_staff_role_events_actor_created_index").on(table.actorUserId, table.createdAt),
]);

/** Structured internal cases for Admin workflow. */
export const adminOperationalCases = pgTable("admin_operational_cases", {
  id: serial("id").primaryKey(),
  caseType: adminCaseTypeEnum("caseType").notNull(),
  targetId: integer("targetId").notNull(),
  status: adminCaseStatusEnum("status").default("open").notNull(),
  priority: adminCasePriorityEnum("priority").default("normal").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  internalNote: text("internalNote"),
  assignedAdminUserId: integer("assignedAdminUserId"),
  openedByUserId: integer("openedByUserId").notNull(),
  resolvedByUserId: integer("resolvedByUserId"),
  reviewDueAt: timestamp("reviewDueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("admin_operational_cases_status_created_index").on(table.status, table.createdAt),
  index("admin_operational_cases_target_index").on(table.caseType, table.targetId),
  index("admin_operational_cases_assignee_index").on(table.assignedAdminUserId, table.status),
]);

/** Append-only ownership transitions for operational cases. */
export const adminCaseAssignments = pgTable("admin_case_assignments", {
  id: serial("id").primaryKey(),
  caseId: integer("caseId").notNull(),
  assignedByUserId: integer("assignedByUserId").notNull(),
  assignedToUserId: integer("assignedToUserId").notNull(),
  assignmentType: adminCaseAssignmentTypeEnum("assignmentType").notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("admin_case_assignments_case_created_index").on(table.caseId, table.createdAt),
  index("admin_case_assignments_assignee_created_index").on(table.assignedToUserId, table.createdAt),
]);

/** Escalation records for SLA risk. */
export const adminCaseEscalations = pgTable("admin_case_escalations", {
  id: serial("id").primaryKey(),
  caseId: integer("caseId").notNull(),
  severity: adminCaseEscalationSeverityEnum("severity").notNull(),
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  acknowledgedByUserId: integer("acknowledgedByUserId"),
  acknowledgedAt: timestamp("acknowledgedAt"),
}, (table) => [
  uniqueIndex("admin_case_escalations_case_severity_unique").on(table.caseId, table.severity),
  index("admin_case_escalations_acknowledged_triggered_index").on(table.acknowledgedAt, table.triggeredAt),
]);

/** Advisory model outputs for AI triage. */
export const adminAiTriageAssessments = pgTable("admin_ai_triage_assessments", {
  id: serial("id").primaryKey(),
  subjectType: adminAiSubjectTypeEnum("subjectType").notNull(),
  subjectId: integer("subjectId").notNull(),
  requestedByUserId: integer("requestedByUserId").notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  inputSummary: text("inputSummary").notNull(),
  assessmentSummary: varchar("assessmentSummary", { length: 1000 }).notNull(),
  confidenceBps: integer("confidenceBps").notNull(),
  recommendedPriority: adminAiRecommendedPriorityEnum("recommendedPriority").notNull(),
  suggestedDisposition: adminAiDispositionEnum("suggestedDisposition").notNull(),
  safetySignalsJson: text("safetySignalsJson").notNull(),
  reviewState: adminAiReviewStateEnum("reviewState").default("pending_human_review").notNull(),
  humanReviewedByUserId: integer("humanReviewedByUserId"),
  humanReviewedAt: timestamp("humanReviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("admin_ai_triage_subject_created_index").on(table.subjectType, table.subjectId, table.createdAt),
  index("admin_ai_triage_review_state_created_index").on(table.reviewState, table.createdAt),
]);

/** Human quality labels for AI triage feedback. */
export const adminAiTriageFeedback = pgTable("admin_ai_triage_feedback", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessmentId").notNull(),
  submittedByUserId: integer("submittedByUserId").notNull(),
  outcome: adminAiFeedbackOutcomeEnum("outcome").notNull(),
  note: varchar("note", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("admin_ai_triage_feedback_assessment_created_index").on(table.assessmentId, table.createdAt),
  index("admin_ai_triage_feedback_outcome_created_index").on(table.outcome, table.createdAt),
]);

/** Encrypted TOTP material for admin MFA. */
export const adminMfaEnrollments = pgTable("admin_mfa_enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  secretCiphertext: text("secretCiphertext").notNull(),
  status: adminMfaStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
  disabledAt: timestamp("disabledAt"),
}, (table) => [
  uniqueIndex("admin_mfa_enrollment_user_unique").on(table.userId),
  index("admin_mfa_enrollment_status_created_index").on(table.status, table.createdAt),
]);

/** One-time recovery codes stored as hashes. */
export const adminMfaRecoveryCodes = pgTable("admin_mfa_recovery_codes", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollmentId").notNull(),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("admin_mfa_recovery_enrollment_used_index").on(table.enrollmentId, table.usedAt),
  uniqueIndex("admin_mfa_recovery_hash_unique").on(table.codeHash),
]);

/** Opaque, browser-bound MFA sessions. */
export const adminWebSessions = pgTable("admin_web_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  userAgent: varchar("userAgent", { length: 500 }),
  mfaVerifiedAt: timestamp("mfaVerifiedAt").notNull(),
  lastSeenAt: timestamp("lastSeenAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  revokedByUserId: integer("revokedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_web_sessions_token_unique").on(table.tokenHash),
  index("admin_web_sessions_user_expiry_index").on(table.userId, table.expiresAt),
  index("admin_web_sessions_active_expiry_index").on(table.revokedAt, table.expiresAt),
]);

/** Security-relevant authentication decisions. */
export const adminWebLoginAttempts = pgTable("admin_web_login_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  eventType: adminWebLoginEventTypeEnum("eventType").notNull(),
  success: boolean("success").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  userAgent: varchar("userAgent", { length: 500 }),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("admin_web_login_user_created_index").on(table.userId, table.createdAt),
  index("admin_web_login_event_created_index").on(table.eventType, table.createdAt),
]);

/** Delivery state for security alerts. */
export const adminWebSecurityAlerts = pgTable("admin_web_security_alerts", {
  id: serial("id").primaryKey(),
  alertType: adminAlertTypeEnum("alertType").notNull(),
  scopeKey: varchar("scopeKey", { length: 160 }).notNull(),
  lastEventCount: integer("lastEventCount").notNull(),
  lastDeliveredAt: timestamp("lastDeliveredAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_web_security_alert_scope_unique").on(table.alertType, table.scopeKey),
  index("admin_web_security_alert_delivered_index").on(table.lastDeliveredAt),
]);

/** Staff credentials separate from marketplace identities. */
export const adminStaffCredentials = pgTable("admin_staff_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  username: varchar("username", { length: 80 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  status: adminCredentialStatusEnum("status").default("active").notNull(),
  passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(),
  createdByUserId: integer("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_staff_credentials_user_unique").on(table.userId),
  uniqueIndex("admin_staff_credentials_username_unique").on(table.username),
  index("admin_staff_credentials_status_index").on(table.status),
]);

/** Short-lived opaque credential sessions. */
export const adminCredentialSessions = pgTable("admin_credential_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_credential_sessions_token_unique").on(table.tokenHash),
  index("admin_credential_sessions_user_expiry_index").on(table.userId, table.expiresAt),
]);

/** Persisted credential attempts for rate limits. */
export const adminCredentialLoginAttempts = pgTable("admin_credential_login_attempts", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 80 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  success: boolean("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("admin_credential_login_username_created_index").on(table.username, table.createdAt),
  index("admin_credential_login_ip_created_index").on(table.ipAddress, table.createdAt),
]);

/** A non-empty active ruleset enables default-deny IPv4 CIDR allowlisting. */
export const adminIpAllowlist = pgTable("admin_ip_allowlist", {
  id: serial("id").primaryKey(),
  cidr: varchar("cidr", { length: 64 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  status: adminIpAllowlistStatusEnum("status").default("active").notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_ip_allowlist_cidr_unique").on(table.cidr),
  index("admin_ip_allowlist_status_created_index").on(table.status, table.createdAt),
]);

/** Restaurant KDS acknowledgement. */
export const orderKitchenAcknowledgements = pgTable("order_kitchen_acknowledgements", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  acknowledgedByUserId: integer("acknowledgedByUserId").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("order_kitchen_acknowledgements_order_unique").on(table.orderId),
]);

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  customerUserId: integer("customerUserId").notNull(),
  orderId: integer("orderId"),
  category: supportCategoryEnum("category").notNull(),
  subject: varchar("subject", { length: 140 }).notNull(),
  message: varchar("message", { length: 1500 }).notNull(),
  status: supportStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("support_tickets_customer_created_index").on(table.customerUserId, table.createdAt),
  index("support_tickets_status_created_index").on(table.status, table.createdAt),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  orderUpdatesEnabled: boolean("orderUpdatesEnabled").default(true).notNull(),
  supportUpdatesEnabled: boolean("supportUpdatesEnabled").default(true).notNull(),
  promotionsEnabled: boolean("promotionsEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("notification_preferences_user_unique").on(table.userId),
]);

/** Durable server receipt for an authenticated Rider command. */
export const riderCommandReceipts = pgTable("rider_command_receipts", {
  id: serial("id").primaryKey(),
  riderUserId: integer("riderUserId").notNull(),
  orderId: integer("orderId"),
  commandType: riderCommandTypeEnum("commandType").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 120 }).notNull(),
  payloadJson: text("payloadJson").notNull(),
  status: riderCommandStatusEnum("status").default("processing").notNull(),
  attempts: integer("attempts").default(1).notNull(),
  resultJson: text("resultJson"),
  errorCode: varchar("errorCode", { length: 80 }),
  errorMessage: varchar("errorMessage", { length: 500 }),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("rider_command_receipts_rider_key_unique").on(table.riderUserId, table.idempotencyKey),
  index("rider_command_receipts_rider_status_index").on(table.riderUserId, table.status, table.receivedAt),
  index("rider_command_receipts_order_index").on(table.orderId, table.receivedAt),
]);

/** Registered native device endpoints for push notifications. */
export const notificationDeviceTokens = pgTable("notification_device_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  provider: notificationProviderEnum("provider").default("expo").notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  platform: notificationPlatformEnum("platform").notNull(),
  status: notificationStatusEnum("status").default("active").notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  disabledAt: timestamp("disabledAt"),
  failureReason: varchar("failureReason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("notification_device_tokens_token_unique").on(table.token),
  index("notification_device_tokens_user_status_index").on(table.userId, table.status, table.lastSeenAt),
]);

/** The durable in-app notification source of truth. */
export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  recipientUserId: integer("recipientUserId").notNull(),
  category: notificationCategoryEnum("category").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  route: varchar("route", { length: 255 }),
  orderId: integer("orderId"),
  supportTicketId: integer("supportTicketId"),
  deduplicationKey: varchar("deduplicationKey", { length: 180 }).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_notifications_dedupe_unique").on(table.deduplicationKey),
  index("user_notifications_recipient_read_created_index").on(table.recipientUserId, table.readAt, table.createdAt),
  index("user_notifications_order_created_index").on(table.orderId, table.createdAt),
]);

/** Delivery attempts per channel and device. */
export const notificationDeliveries = pgTable("notification_deliveries", {
  id: serial("id").primaryKey(),
  notificationId: integer("notificationId").notNull(),
  deviceTokenId: integer("deviceTokenId"),
  channel: notificationChannelEnum("channel").notNull(),
  status: notificationDeliveryStatusEnum("status").default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 160 }),
  lastError: varchar("lastError", { length: 500 }),
  nextAttemptAt: timestamp("nextAttemptAt"),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("notification_delivery_channel_device_unique").on(table.notificationId, table.channel, table.deviceTokenId),
  index("notification_deliveries_pending_index").on(table.channel, table.status, table.nextAttemptAt, table.createdAt),
]);

/** Support ticket messages. */
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticketId").notNull(),
  authorUserId: integer("authorUserId"),
  authorType: supportAuthorTypeEnum("authorType").notNull(),
  visibility: supportVisibilityEnum("visibility").default("customer_visible").notNull(),
  body: varchar("body", { length: 2000 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("support_ticket_messages_ticket_created_index").on(table.ticketId, table.createdAt),
  index("support_ticket_messages_author_created_index").on(table.authorUserId, table.createdAt),
]);

/** Server-authoritative financial facts. */
export const paymentLedgerEntries = pgTable("payment_ledger_entries", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  organisationId: integer("organisationId").notNull(),
  riderUserId: integer("riderUserId"),
  refundRequestId: integer("refundRequestId"),
  partyType: paymentPartyTypeEnum("partyType").notNull(),
  entryType: paymentEntryTypeEnum("entryType").notNull(),
  amountMinor: integer("amountMinor").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  reference: varchar("reference", { length: 180 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("payment_ledger_entries_reference_unique").on(table.reference),
  index("payment_ledger_business_status_created_index").on(table.organisationId, table.partyType, table.status, table.createdAt),
  index("payment_ledger_rider_status_created_index").on(table.riderUserId, table.partyType, table.status, table.createdAt),
  index("payment_ledger_order_created_index").on(table.orderId, table.createdAt),
]);

/** Customer-requested refunds. */
export const refundRequests = pgTable("refund_requests", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  supportTicketId: integer("supportTicketId").notNull(),
  customerUserId: integer("customerUserId").notNull(),
  requestedMinor: integer("requestedMinor").notNull(),
  reason: varchar("reason", { length: 1000 }).notNull(),
  status: refundStatusEnum("status").default("requested").notNull(),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  settledByUserId: integer("settledByUserId"),
  settledAt: timestamp("settledAt"),
  decisionNote: varchar("decisionNote", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("refund_requests_customer_created_index").on(table.customerUserId, table.createdAt),
  index("refund_requests_order_status_index").on(table.orderId, table.status),
  index("refund_requests_status_created_index").on(table.status, table.createdAt),
]);

/** Deterministic dispatch score snapshot. */
export const dispatchScoreSnapshots = pgTable("dispatch_score_snapshots", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  riderUserId: integer("riderUserId").notNull(),
  score: integer("score").notNull(),
  activeWorkload: integer("activeWorkload").notNull(),
  availabilityAgeSeconds: integer("availabilityAgeSeconds").notNull(),
  eligibility: dispatchEligibilityEnum("eligibility").notNull(),
  explanationJson: text("explanationJson").notNull(),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("dispatch_score_order_rider_unique").on(table.orderId, table.riderUserId),
  index("dispatch_score_order_rank_index").on(table.orderId, table.eligibility, table.score),
]);

/** A Rider may share location only during one assigned delivery session. */
export const riderTrackingSessions = pgTable("rider_tracking_sessions", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  riderUserId: integer("riderUserId").notNull(),
  status: riderTrackingStatusEnum("status").default("active").notNull(),
  consentGrantedAt: timestamp("consentGrantedAt").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  pausedAt: timestamp("pausedAt"),
  endedAt: timestamp("endedAt"),
  endedReason: riderTrackingEndReasonEnum("endedReason"),
  lastLocationAt: timestamp("lastLocationAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("rider_tracking_sessions_order_unique").on(table.orderId),
  index("rider_tracking_sessions_rider_status_index").on(table.riderUserId, table.status, table.updatedAt),
]);

/** Append-only, foreground rider position updates. */
export const riderLocationUpdates = pgTable("rider_location_updates", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  riderUserId: integer("riderUserId").notNull(),
  latitudeE6: integer("latitudeE6").notNull(),
  longitudeE6: integer("longitudeE6").notNull(),
  accuracyMeters: integer("accuracyMeters"),
  source: riderLocationSourceEnum("source").default("foreground").notNull(),
  deviceObservedAt: timestamp("deviceObservedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("rider_location_updates_order_created_index").on(table.orderId, table.createdAt),
  index("rider_location_updates_rider_created_index").on(table.riderUserId, table.createdAt),
]);

/** Cached route/ETA facts. */
export const deliveryRouteSnapshots = pgTable("delivery_route_snapshots", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  status: deliveryRouteStatusEnum("status").default("estimated").notNull(),
  distanceMeters: integer("distanceMeters"),
  durationSeconds: integer("durationSeconds"),
  etaMinutes: integer("etaMinutes"),
  provider: varchar("provider", { length: 80 }).notNull(),
  routeRevision: varchar("routeRevision", { length: 100 }).notNull(),
  responseMetadataJson: varchar("responseMetadataJson", { length: 2000 }).notNull().default("{}"),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("delivery_route_snapshots_order_revision_unique").on(table.orderId, table.routeRevision),
  index("delivery_route_snapshots_order_computed_index").on(table.orderId, table.computedAt),
]);

export const businessDocuments = pgTable("business_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("applicationId").notNull(),
  organisationId: integer("organisationId"),
  uploadedByUserId: integer("uploadedByUserId").notNull(),
  documentType: businessDocumentTypeEnum("documentType").notNull(),
  status: businessDocumentStatusEnum("status").default("uploaded").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  reviewerNote: varchar("reviewerNote", { length: 1000 }),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("business_documents_application_index").on(table.applicationId, table.documentType),
  index("business_documents_reviewer_index").on(table.reviewedByUserId),
]);

export const businessPayoutProfiles = pgTable("business_payout_profiles", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisationId").notNull(),
  provider: varchar("provider", { length: 80 }),
  accountHolderName: varchar("accountHolderName", { length: 160 }),
  accountReference: varchar("accountReference", { length: 160 }),
  status: businessChecklistStatusEnum("status").default("missing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("business_payout_profiles_org_unique").on(table.organisationId),
]);

export const businessStaffMemberships = pgTable("business_staff_memberships", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisationId").notNull(),
  userId: integer("userId").notNull(),
  staffRole: businessStaffRoleEnum("staffRole").notNull(),
  outletId: integer("outletId"),
  cloudKitchenId: integer("cloudKitchenId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("business_staff_org_user_unique").on(table.organisationId, table.userId),
  index("business_staff_user_index").on(table.userId),
]);

export const businessReviewChecklists = pgTable("business_review_checklists", {
  id: serial("id").primaryKey(),
  applicationId: integer("applicationId").notNull(),
  requirementKey: varchar("requirementKey", { length: 120 }).notNull(),
  status: businessChecklistStatusEnum("status").default("missing").notNull(),
  note: varchar("note", { length: 1000 }),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("business_checklist_application_key_unique").on(table.applicationId, table.requirementKey),
  index("business_checklist_status_index").on(table.applicationId, table.status),
]);

// ─── Type exports ─────────────────────────────────────────────────────────────
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
