CREATE TYPE "public"."admin_ai_disposition" AS ENUM('retain_for_human_review', 'prioritize_review', 'additional_evidence_needed');--> statement-breakpoint
CREATE TYPE "public"."admin_ai_feedback_outcome" AS ENUM('confirmed_accurate', 'false_positive', 'false_negative', 'needs_more_evidence');--> statement-breakpoint
CREATE TYPE "public"."admin_ai_recommended_priority" AS ENUM('normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."admin_ai_review_state" AS ENUM('pending_human_review', 'acknowledged', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."admin_ai_subject_type" AS ENUM('photo_report', 'business_emergency');--> statement-breakpoint
CREATE TYPE "public"."admin_alert_type" AS ENUM('repeated_mfa_failures', 'repeated_ip_denials');--> statement-breakpoint
CREATE TYPE "public"."admin_case_assignment_type" AS ENUM('assigned', 'reassigned');--> statement-breakpoint
CREATE TYPE "public"."admin_case_escalation_severity" AS ENUM('at_risk', 'breached');--> statement-breakpoint
CREATE TYPE "public"."admin_case_priority" AS ENUM('normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."admin_case_status" AS ENUM('open', 'in_progress', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."admin_case_type" AS ENUM('business_emergency', 'rider_remittance');--> statement-breakpoint
CREATE TYPE "public"."admin_credential_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."admin_ip_allowlist_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."admin_mfa_status" AS ENUM('pending', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."admin_staff_action" AS ENUM('provisioned', 'delegated', 'deactivated', 'reactivated');--> statement-breakpoint
CREATE TYPE "public"."admin_staff_role_type" AS ENUM('support_agent', 'moderation_agent', 'finance_operator', 'senior_operations');--> statement-breakpoint
CREATE TYPE "public"."admin_staff_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."admin_web_login_event_type" AS ENUM('oauth_authenticated', 'mfa_enrollment_started', 'mfa_enrollment_confirmed', 'mfa_succeeded', 'mfa_failed', 'recovery_code_used', 'ip_denied', 'host_denied', 'session_revoked');--> statement-breakpoint
CREATE TYPE "public"."business_checklist_status" AS ENUM('missing', 'complete', 'changes_required', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."business_document_status" AS ENUM('uploaded', 'accepted', 'changes_required', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."business_document_type" AS ENUM('owner_identity', 'business_registration', 'tax_record', 'payout_evidence', 'outlet_evidence', 'food_safety', 'menu_evidence');--> statement-breakpoint
CREATE TYPE "public"."business_operational_status" AS ENUM('draft', 'pending_review', 'approved', 'live', 'paused', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."business_scope_type" AS ENUM('organisation', 'outlet', 'cloud_kitchen', 'brand');--> statement-breakpoint
CREATE TYPE "public"."business_staff_role" AS ENUM('owner', 'manager', 'counter', 'kitchen_manager', 'station_lead', 'dispatcher', 'finance_viewer');--> statement-breakpoint
CREATE TYPE "public"."businessType" AS ENUM('restaurant', 'cloud_kitchen');--> statement-breakpoint
CREATE TYPE "public"."cod_status" AS ENUM('collected', 'short', 'over');--> statement-breakpoint
CREATE TYPE "public"."delivery_route_status" AS ENUM('estimated', 'provider_unavailable', 'failed');--> statement-breakpoint
CREATE TYPE "public"."dispatch_eligibility" AS ENUM('eligible', 'ineligible');--> statement-breakpoint
CREATE TYPE "public"."geocode_source" AS ENUM('device', 'manual');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('order', 'rider_offer', 'support', 'finance', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'expo_push');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('queued', 'delivered', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."notification_platform" AS ENUM('ios', 'android');--> statement-breakpoint
CREATE TYPE "public"."notification_provider" AS ENUM('expo');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."order_payment_method" AS ENUM('cod');--> statement-breakpoint
CREATE TYPE "public"."order_payment_status" AS ENUM('cash_due', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('placed', 'accepted', 'preparing', 'ready_for_pickup', 'assigned', 'picked_up', 'delivered', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."outbox_domain" AS ENUM('business-onboarding', 'admin', 'orders', 'riders', 'notifications');--> statement-breakpoint
CREATE TYPE "public"."payment_entry_type" AS ENUM('order_total_due', 'cash_collected', 'business_payable', 'platform_commission', 'rider_cash_custody', 'refund_requested', 'refund_approved', 'refund_settled', 'refund_rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_party_type" AS ENUM('customer', 'business', 'rider', 'platform');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'settled', 'failed', 'void');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'approved', 'settled', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."revenue_base" AS ENUM('item_subtotal_after_discount');--> statement-breakpoint
CREATE TYPE "public"."review_photo_privacy" AS ENUM('public', 'business_only', 'platform_only');--> statement-breakpoint
CREATE TYPE "public"."review_photo_report_reason" AS ENUM('nudity', 'hate_or_harassment', 'violence', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."review_photo_report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."review_visibility" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."rider_cash_account_status" AS ENUM('active', 'restricted', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."rider_cash_entry_type" AS ENUM('commission_reserved', 'commission_released', 'cash_collected', 'cash_variance', 'settlement_adjustment');--> statement-breakpoint
CREATE TYPE "public"."rider_command_status" AS ENUM('processing', 'succeeded', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."rider_command_type" AS ENUM('offer_decision', 'transition', 'cod_collection', 'location_update', 'availability');--> statement-breakpoint
CREATE TYPE "public"."rider_location_source" AS ENUM('foreground', 'background');--> statement-breakpoint
CREATE TYPE "public"."rider_offer_status" AS ENUM('offered', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."rider_online_status" AS ENUM('online', 'offline');--> statement-breakpoint
CREATE TYPE "public"."rider_tracking_end_reason" AS ENUM('delivery_completed', 'order_cancelled', 'rider_paused', 'rider_stopped', 'session_replaced');--> statement-breakpoint
CREATE TYPE "public"."rider_tracking_status" AS ENUM('active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."settlement_entry_status" AS ENUM('open', 'reconciled', 'void');--> statement-breakpoint
CREATE TYPE "public"."settlement_entry_type" AS ENUM('commission', 'restaurant_payable', 'rider_cash_custody', 'collection_variance');--> statement-breakpoint
CREATE TYPE "public"."settlement_party_type" AS ENUM('platform', 'restaurant', 'rider');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('unsettled', 'reconciled', 'variance', 'waived');--> statement-breakpoint
CREATE TYPE "public"."support_author_type" AS ENUM('customer', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."support_category" AS ENUM('order', 'delivery', 'payment', 'account', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."support_visibility" AS ENUM('customer_visible', 'internal');--> statement-breakpoint
CREATE TYPE "public"."workspace_application_status" AS ENUM('draft', 'submitted', 'changes_required', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."workspaceApplicationType" AS ENUM('business', 'rider');--> statement-breakpoint
CREATE TYPE "public"."workspace_membership_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."workspaceType" AS ENUM('customer', 'business', 'rider');--> statement-breakpoint
CREATE TABLE "account_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"givenName" varchar(100),
	"phoneE164" varchar(20),
	"phoneVerifiedAt" timestamp,
	"defaultCity" varchar(120),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_ai_triage_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"subjectType" "admin_ai_subject_type" NOT NULL,
	"subjectId" integer NOT NULL,
	"requestedByUserId" integer NOT NULL,
	"model" varchar(120) NOT NULL,
	"inputSummary" text NOT NULL,
	"assessmentSummary" varchar(1000) NOT NULL,
	"confidenceBps" integer NOT NULL,
	"recommendedPriority" "admin_ai_recommended_priority" NOT NULL,
	"suggestedDisposition" "admin_ai_disposition" NOT NULL,
	"safetySignalsJson" text NOT NULL,
	"reviewState" "admin_ai_review_state" DEFAULT 'pending_human_review' NOT NULL,
	"humanReviewedByUserId" integer,
	"humanReviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_ai_triage_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessmentId" integer NOT NULL,
	"submittedByUserId" integer NOT NULL,
	"outcome" "admin_ai_feedback_outcome" NOT NULL,
	"note" varchar(1000),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_case_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"caseId" integer NOT NULL,
	"assignedByUserId" integer NOT NULL,
	"assignedToUserId" integer NOT NULL,
	"assignmentType" "admin_case_assignment_type" NOT NULL,
	"note" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_case_escalations" (
	"id" serial PRIMARY KEY NOT NULL,
	"caseId" integer NOT NULL,
	"severity" "admin_case_escalation_severity" NOT NULL,
	"triggeredAt" timestamp DEFAULT now() NOT NULL,
	"acknowledgedByUserId" integer,
	"acknowledgedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "admin_credential_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(80) NOT NULL,
	"ipAddress" varchar(64) NOT NULL,
	"success" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_credential_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"ipAddress" varchar(64) NOT NULL,
	"host" varchar(255) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_ip_allowlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"cidr" varchar(64) NOT NULL,
	"label" varchar(120) NOT NULL,
	"status" "admin_ip_allowlist_status" DEFAULT 'active' NOT NULL,
	"createdByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_mfa_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"secretCiphertext" text NOT NULL,
	"status" "admin_mfa_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"confirmedAt" timestamp,
	"disabledAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "admin_mfa_recovery_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollmentId" integer NOT NULL,
	"codeHash" varchar(128) NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_operational_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"caseType" "admin_case_type" NOT NULL,
	"targetId" integer NOT NULL,
	"status" "admin_case_status" DEFAULT 'open' NOT NULL,
	"priority" "admin_case_priority" DEFAULT 'normal' NOT NULL,
	"reason" varchar(500) NOT NULL,
	"internalNote" text,
	"assignedAdminUserId" integer,
	"openedByUserId" integer NOT NULL,
	"resolvedByUserId" integer,
	"reviewDueAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_staff_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"username" varchar(80) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"status" "admin_credential_status" DEFAULT 'active' NOT NULL,
	"passwordChangedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_staff_role_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"targetUserId" integer NOT NULL,
	"actorUserId" integer NOT NULL,
	"previousRole" "admin_staff_role_type",
	"nextRole" "admin_staff_role_type",
	"action" "admin_staff_action" NOT NULL,
	"note" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_staff_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"staffRole" "admin_staff_role_type" NOT NULL,
	"status" "admin_staff_status" DEFAULT 'active' NOT NULL,
	"grantedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_web_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"eventType" "admin_web_login_event_type" NOT NULL,
	"success" boolean NOT NULL,
	"ipAddress" varchar(64) NOT NULL,
	"host" varchar(255) NOT NULL,
	"userAgent" varchar(500),
	"reason" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_web_security_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"alertType" "admin_alert_type" NOT NULL,
	"scopeKey" varchar(160) NOT NULL,
	"lastEventCount" integer NOT NULL,
	"lastDeliveredAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_web_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"ipAddress" varchar(64) NOT NULL,
	"host" varchar(255) NOT NULL,
	"userAgent" varchar(500),
	"mfaVerifiedAt" timestamp NOT NULL,
	"lastSeenAt" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"revokedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorUserId" integer,
	"entityType" varchar(80) NOT NULL,
	"entityId" varchar(80) NOT NULL,
	"action" varchar(120) NOT NULL,
	"previousValue" text,
	"nextValue" text,
	"correlationId" varchar(80),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_application_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicationId" integer NOT NULL,
	"legalName" varchar(180),
	"displayName" varchar(160),
	"supportPhone" varchar(20),
	"city" varchar(120),
	"addressLine1" varchar(255),
	"description" text,
	"pickupInstructions" varchar(500),
	"prepTimeMinutes" integer,
	"openingTime" varchar(5),
	"closingTime" varchar(5),
	"cuisine" varchar(120),
	"cloudKitchenPayload" text,
	"serviceZonePayload" text,
	"menuPayload" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_commission_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisationId" integer NOT NULL,
	"commissionRateBps" integer NOT NULL,
	"revenueBase" "revenue_base" DEFAULT 'item_subtotal_after_discount' NOT NULL,
	"taxTreatment" varchar(120) DEFAULT 'pilot_pending' NOT NULL,
	"settlementCadence" varchar(80) DEFAULT 'manual_pilot' NOT NULL,
	"effectiveFrom" timestamp DEFAULT now() NOT NULL,
	"effectiveUntil" timestamp,
	"approvedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicationId" integer NOT NULL,
	"organisationId" integer,
	"uploadedByUserId" integer NOT NULL,
	"documentType" "business_document_type" NOT NULL,
	"status" "business_document_status" DEFAULT 'uploaded' NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"mimeType" varchar(120) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"reviewerNote" varchar(1000),
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"scopeType" "business_scope_type" NOT NULL,
	"scopeId" integer NOT NULL,
	"weekday" integer NOT NULL,
	"opensAt" varchar(5),
	"closesAt" varchar(5),
	"isClosed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_organisations" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicationId" integer NOT NULL,
	"ownerUserId" integer NOT NULL,
	"businessType" "businessType" NOT NULL,
	"legalName" varchar(180) NOT NULL,
	"displayName" varchar(160) NOT NULL,
	"supportPhone" varchar(20) NOT NULL,
	"city" varchar(120) NOT NULL,
	"status" "business_operational_status" DEFAULT 'approved' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_outlets" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisationId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"cuisine" varchar(120) NOT NULL,
	"description" text,
	"addressLine1" varchar(255) NOT NULL,
	"city" varchar(120) NOT NULL,
	"latitudeE6" integer,
	"longitudeE6" integer,
	"pickupInstructions" varchar(500),
	"prepTimeMinutes" integer NOT NULL,
	"acceptsDelivery" boolean DEFAULT true NOT NULL,
	"isPaused" boolean DEFAULT false NOT NULL,
	"status" "business_operational_status" DEFAULT 'approved' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_payout_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisationId" integer NOT NULL,
	"provider" varchar(80),
	"accountHolderName" varchar(160),
	"accountReference" varchar(160),
	"status" "business_checklist_status" DEFAULT 'missing' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_review_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicationId" integer NOT NULL,
	"requirementKey" varchar(120) NOT NULL,
	"status" "business_checklist_status" DEFAULT 'missing' NOT NULL,
	"note" varchar(1000),
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_staff_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisationId" integer NOT NULL,
	"userId" integer NOT NULL,
	"staffRole" "business_staff_role" NOT NULL,
	"outletId" integer,
	"cloudKitchenId" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_kitchens" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisationId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"addressLine1" varchar(255) NOT NULL,
	"city" varchar(120) NOT NULL,
	"pickupInstructions" varchar(500),
	"capacityLimit" integer NOT NULL,
	"activeOrderLimit" integer NOT NULL,
	"isPaused" boolean DEFAULT false NOT NULL,
	"status" "business_operational_status" DEFAULT 'approved' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cod_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"riderUserId" integer NOT NULL,
	"expectedMinor" integer NOT NULL,
	"collectedMinor" integer NOT NULL,
	"varianceMinor" integer NOT NULL,
	"varianceReason" varchar(500),
	"status" "cod_status" NOT NULL,
	"confirmedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"label" varchar(80) NOT NULL,
	"recipientName" varchar(160) NOT NULL,
	"phoneE164" varchar(20) NOT NULL,
	"addressLine1" varchar(255) NOT NULL,
	"addressLine2" varchar(255),
	"city" varchar(120) NOT NULL,
	"instructions" varchar(500),
	"latitudeE6" integer NOT NULL,
	"longitudeE6" integer NOT NULL,
	"geocodeSource" "geocode_source" DEFAULT 'device' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_route_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"status" "delivery_route_status" DEFAULT 'estimated' NOT NULL,
	"distanceMeters" integer,
	"durationSeconds" integer,
	"etaMinutes" integer,
	"provider" varchar(80) NOT NULL,
	"routeRevision" varchar(100) NOT NULL,
	"responseMetadataJson" varchar(2000) DEFAULT '{}' NOT NULL,
	"computedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_score_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"riderUserId" integer NOT NULL,
	"score" integer NOT NULL,
	"activeWorkload" integer NOT NULL,
	"availabilityAgeSeconds" integer NOT NULL,
	"eligibility" "dispatch_eligibility" NOT NULL,
	"explanationJson" text NOT NULL,
	"computedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_outbox_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(80) NOT NULL,
	"eventType" varchar(120) NOT NULL,
	"aggregateType" varchar(80) NOT NULL,
	"aggregateId" varchar(80) NOT NULL,
	"payload" text NOT NULL,
	"deduplicationKey" varchar(180) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"nextAttemptAt" timestamp,
	"processedAt" timestamp,
	"occurredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"cloudKitchenId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"cuisine" varchar(120) NOT NULL,
	"description" text,
	"prepTimeMinutes" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"outletId" integer,
	"kitchenBrandId" integer,
	"name" varchar(120) NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"archivedAt" timestamp,
	"archivedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoryId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"priceMinor" integer NOT NULL,
	"prepTimeMinutes" integer NOT NULL,
	"imageKey" varchar(500),
	"isAvailable" boolean DEFAULT true NOT NULL,
	"archivedAt" timestamp,
	"archivedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_modifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"menuItemId" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"priceMinor" integer DEFAULT 0 NOT NULL,
	"isRequired" boolean DEFAULT false NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"archivedAt" timestamp,
	"archivedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificationId" integer NOT NULL,
	"deviceTokenId" integer,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"providerMessageId" varchar(160),
	"lastError" varchar(500),
	"nextAttemptAt" timestamp,
	"deliveredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_device_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"provider" "notification_provider" DEFAULT 'expo' NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" "notification_platform" NOT NULL,
	"status" "notification_status" DEFAULT 'active' NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"disabledAt" timestamp,
	"failureReason" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"orderUpdatesEnabled" boolean DEFAULT true NOT NULL,
	"supportUpdatesEnabled" boolean DEFAULT true NOT NULL,
	"promotionsEnabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_modifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderItemId" integer NOT NULL,
	"menuModifierId" integer,
	"modifierName" varchar(120) NOT NULL,
	"unitPriceMinor" integer NOT NULL,
	"quantity" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"menuItemId" integer,
	"dishName" varchar(160) NOT NULL,
	"dishDescription" text,
	"dishImageKey" varchar(500),
	"unitPriceMinor" integer NOT NULL,
	"modifierTotalMinor" integer DEFAULT 0 NOT NULL,
	"lineTotalMinor" integer NOT NULL,
	"quantity" integer NOT NULL,
	"prepTimeMinutes" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_kitchen_acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"acknowledgedByUserId" integer NOT NULL,
	"acknowledgedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"organisationId" integer NOT NULL,
	"customerUserId" integer NOT NULL,
	"rating" integer NOT NULL,
	"publicComment" varchar(1000),
	"privateFeedback" varchar(1000),
	"feedbackTopicsJson" varchar(500) DEFAULT '[]' NOT NULL,
	"visibility" "review_visibility" DEFAULT 'published' NOT NULL,
	"businessReply" varchar(1000),
	"businessRepliedAt" timestamp,
	"moderatedByUserId" integer,
	"moderatedAt" timestamp,
	"moderationNote" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"fromStatus" "order_status",
	"toStatus" "order_status" NOT NULL,
	"actorUserId" integer,
	"note" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"publicId" varchar(40) NOT NULL,
	"customerUserId" integer NOT NULL,
	"organisationId" integer NOT NULL,
	"outletId" integer,
	"kitchenBrandId" integer,
	"status" "order_status" DEFAULT 'placed' NOT NULL,
	"paymentMethod" "order_payment_method" DEFAULT 'cod' NOT NULL,
	"paymentStatus" "order_payment_status" DEFAULT 'cash_due' NOT NULL,
	"deliveryRecipientName" varchar(160) NOT NULL,
	"deliveryPhoneE164" varchar(20) NOT NULL,
	"deliveryAddressLine1" varchar(255) NOT NULL,
	"deliveryAddressLine2" varchar(255),
	"deliveryCity" varchar(120) NOT NULL,
	"deliveryInstructions" varchar(500),
	"deliveryAddressId" integer,
	"deliveryLatitudeE6" integer,
	"deliveryLongitudeE6" integer,
	"deliveryZoneId" integer,
	"deliveryDistanceMeters" integer,
	"estimatedCourierMinutes" integer,
	"estimatedTotalMinutes" integer,
	"itemSubtotalMinor" integer NOT NULL,
	"deliveryFeeMinor" integer NOT NULL,
	"serviceFeeMinor" integer DEFAULT 0 NOT NULL,
	"discountMinor" integer DEFAULT 0 NOT NULL,
	"totalMinor" integer NOT NULL,
	"commissionPolicyId" integer,
	"commissionRateBps" integer DEFAULT 0 NOT NULL,
	"commissionableSubtotalMinor" integer DEFAULT 0 NOT NULL,
	"platformCommissionMinor" integer DEFAULT 0 NOT NULL,
	"restaurantPayableMinor" integer DEFAULT 0 NOT NULL,
	"riderCashCustodyMinor" integer DEFAULT 0 NOT NULL,
	"settlementStatus" "settlement_status" DEFAULT 'unsettled' NOT NULL,
	"idempotencyKey" varchar(100) NOT NULL,
	"placedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"organisationId" integer NOT NULL,
	"riderUserId" integer,
	"refundRequestId" integer,
	"partyType" "payment_party_type" NOT NULL,
	"entryType" "payment_entry_type" NOT NULL,
	"amountMinor" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"reference" varchar(180) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"cloudKitchenId" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"capacityLimit" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"supportTicketId" integer NOT NULL,
	"customerUserId" integer NOT NULL,
	"requestedMinor" integer NOT NULL,
	"reason" varchar(1000) NOT NULL,
	"status" "refund_status" DEFAULT 'requested' NOT NULL,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"settledByUserId" integer,
	"settledAt" timestamp,
	"decisionNote" varchar(1000),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_photo_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"photoId" integer NOT NULL,
	"reporterUserId" integer NOT NULL,
	"reason" "review_photo_report_reason" NOT NULL,
	"details" varchar(500),
	"status" "review_photo_report_status" DEFAULT 'open' NOT NULL,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewId" integer NOT NULL,
	"customerUserId" integer NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"mimeType" varchar(40) NOT NULL,
	"byteSize" integer NOT NULL,
	"privacy" "review_photo_privacy" DEFAULT 'business_only' NOT NULL,
	"removedAt" timestamp,
	"removedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"riderUserId" integer NOT NULL,
	"assignedByUserId" integer NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"offerStatus" "rider_offer_status" DEFAULT 'accepted' NOT NULL,
	"offerExpiresAt" timestamp,
	"respondedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"riderUserId" integer NOT NULL,
	"status" "rider_online_status" DEFAULT 'offline' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_cash_account_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"riderCashAccountId" integer NOT NULL,
	"riderUserId" integer NOT NULL,
	"orderId" integer,
	"entryType" "rider_cash_entry_type" NOT NULL,
	"amountMinor" integer NOT NULL,
	"balanceAfterMinor" integer NOT NULL,
	"reference" varchar(160) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_cash_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"riderUserId" integer NOT NULL,
	"balanceMinor" integer DEFAULT 0 NOT NULL,
	"status" "rider_cash_account_status" DEFAULT 'active' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_cash_settlement_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"riderUserId" integer NOT NULL,
	"riderCashAccountId" integer NOT NULL,
	"cashAccountEntryId" integer NOT NULL,
	"receiptCode" varchar(80) NOT NULL,
	"amountMinor" integer NOT NULL,
	"balanceAfterMinor" integer NOT NULL,
	"reconciledOrderIdsJson" text NOT NULL,
	"issuedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_command_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"riderUserId" integer NOT NULL,
	"orderId" integer,
	"commandType" "rider_command_type" NOT NULL,
	"idempotencyKey" varchar(120) NOT NULL,
	"payloadJson" text NOT NULL,
	"status" "rider_command_status" DEFAULT 'processing' NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"resultJson" text,
	"errorCode" varchar(80),
	"errorMessage" varchar(500),
	"receivedAt" timestamp DEFAULT now() NOT NULL,
	"processedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_location_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"riderUserId" integer NOT NULL,
	"latitudeE6" integer NOT NULL,
	"longitudeE6" integer NOT NULL,
	"accuracyMeters" integer,
	"source" "rider_location_source" DEFAULT 'foreground' NOT NULL,
	"deviceObservedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_tracking_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"riderUserId" integer NOT NULL,
	"status" "rider_tracking_status" DEFAULT 'active' NOT NULL,
	"consentGrantedAt" timestamp NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"pausedAt" timestamp,
	"endedAt" timestamp,
	"endedReason" "rider_tracking_end_reason",
	"lastLocationAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisationId" integer NOT NULL,
	"outletId" integer,
	"cloudKitchenId" integer,
	"name" varchar(120) NOT NULL,
	"city" varchar(120) NOT NULL,
	"centerLatitudeE6" integer,
	"centerLongitudeE6" integer,
	"radiusMeters" integer,
	"courierBaseMinutes" integer DEFAULT 8 NOT NULL,
	"courierMinutesPerKm" integer DEFAULT 3 NOT NULL,
	"deliveryFeeMinor" integer DEFAULT 0 NOT NULL,
	"minimumOrderMinor" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"organisationId" integer NOT NULL,
	"partyType" "settlement_party_type" NOT NULL,
	"entryType" "settlement_entry_type" NOT NULL,
	"amountMinor" integer NOT NULL,
	"status" "settlement_entry_status" DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticketId" integer NOT NULL,
	"authorUserId" integer,
	"authorType" "support_author_type" NOT NULL,
	"visibility" "support_visibility" DEFAULT 'customer_visible' NOT NULL,
	"body" varchar(2000) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerUserId" integer NOT NULL,
	"orderId" integer,
	"category" "support_category" NOT NULL,
	"subject" varchar(140) NOT NULL,
	"message" varchar(1500) NOT NULL,
	"status" "support_status" DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipientUserId" integer NOT NULL,
	"category" "notification_category" NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" varchar(500) NOT NULL,
	"route" varchar(255),
	"orderId" integer,
	"supportTicketId" integer,
	"deduplicationKey" varchar(180) NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "workspace_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"workspaceType" "workspaceApplicationType" NOT NULL,
	"businessType" "businessType",
	"status" "workspace_application_status" DEFAULT 'draft' NOT NULL,
	"displayName" varchar(160),
	"phoneE164" varchar(20),
	"city" varchar(120),
	"reviewNote" varchar(1000),
	"submittedAt" timestamp,
	"reviewedAt" timestamp,
	"reviewedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"workspaceType" "workspaceType" NOT NULL,
	"status" "workspace_membership_status" DEFAULT 'active' NOT NULL,
	"applicationId" integer,
	"approvedAt" timestamp,
	"suspendedAt" timestamp,
	"suspensionReason" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_profiles_user_unique" ON "account_profiles" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "account_profiles_phone_unique" ON "account_profiles" USING btree ("phoneE164");--> statement-breakpoint
CREATE INDEX "admin_ai_triage_subject_created_index" ON "admin_ai_triage_assessments" USING btree ("subjectType","subjectId","createdAt");--> statement-breakpoint
CREATE INDEX "admin_ai_triage_review_state_created_index" ON "admin_ai_triage_assessments" USING btree ("reviewState","createdAt");--> statement-breakpoint
CREATE INDEX "admin_ai_triage_feedback_assessment_created_index" ON "admin_ai_triage_feedback" USING btree ("assessmentId","createdAt");--> statement-breakpoint
CREATE INDEX "admin_ai_triage_feedback_outcome_created_index" ON "admin_ai_triage_feedback" USING btree ("outcome","createdAt");--> statement-breakpoint
CREATE INDEX "admin_case_assignments_case_created_index" ON "admin_case_assignments" USING btree ("caseId","createdAt");--> statement-breakpoint
CREATE INDEX "admin_case_assignments_assignee_created_index" ON "admin_case_assignments" USING btree ("assignedToUserId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_case_escalations_case_severity_unique" ON "admin_case_escalations" USING btree ("caseId","severity");--> statement-breakpoint
CREATE INDEX "admin_case_escalations_acknowledged_triggered_index" ON "admin_case_escalations" USING btree ("acknowledgedAt","triggeredAt");--> statement-breakpoint
CREATE INDEX "admin_credential_login_username_created_index" ON "admin_credential_login_attempts" USING btree ("username","createdAt");--> statement-breakpoint
CREATE INDEX "admin_credential_login_ip_created_index" ON "admin_credential_login_attempts" USING btree ("ipAddress","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_credential_sessions_token_unique" ON "admin_credential_sessions" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "admin_credential_sessions_user_expiry_index" ON "admin_credential_sessions" USING btree ("userId","expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_ip_allowlist_cidr_unique" ON "admin_ip_allowlist" USING btree ("cidr");--> statement-breakpoint
CREATE INDEX "admin_ip_allowlist_status_created_index" ON "admin_ip_allowlist" USING btree ("status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_mfa_enrollment_user_unique" ON "admin_mfa_enrollments" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "admin_mfa_enrollment_status_created_index" ON "admin_mfa_enrollments" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "admin_mfa_recovery_enrollment_used_index" ON "admin_mfa_recovery_codes" USING btree ("enrollmentId","usedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_mfa_recovery_hash_unique" ON "admin_mfa_recovery_codes" USING btree ("codeHash");--> statement-breakpoint
CREATE INDEX "admin_operational_cases_status_created_index" ON "admin_operational_cases" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "admin_operational_cases_target_index" ON "admin_operational_cases" USING btree ("caseType","targetId");--> statement-breakpoint
CREATE INDEX "admin_operational_cases_assignee_index" ON "admin_operational_cases" USING btree ("assignedAdminUserId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_staff_credentials_user_unique" ON "admin_staff_credentials" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_staff_credentials_username_unique" ON "admin_staff_credentials" USING btree ("username");--> statement-breakpoint
CREATE INDEX "admin_staff_credentials_status_index" ON "admin_staff_credentials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_staff_role_events_target_created_index" ON "admin_staff_role_events" USING btree ("targetUserId","createdAt");--> statement-breakpoint
CREATE INDEX "admin_staff_role_events_actor_created_index" ON "admin_staff_role_events" USING btree ("actorUserId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_staff_roles_user_unique" ON "admin_staff_roles" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "admin_staff_roles_role_status_index" ON "admin_staff_roles" USING btree ("staffRole","status");--> statement-breakpoint
CREATE INDEX "admin_web_login_user_created_index" ON "admin_web_login_attempts" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "admin_web_login_event_created_index" ON "admin_web_login_attempts" USING btree ("eventType","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_web_security_alert_scope_unique" ON "admin_web_security_alerts" USING btree ("alertType","scopeKey");--> statement-breakpoint
CREATE INDEX "admin_web_security_alert_delivered_index" ON "admin_web_security_alerts" USING btree ("lastDeliveredAt");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_web_sessions_token_unique" ON "admin_web_sessions" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "admin_web_sessions_user_expiry_index" ON "admin_web_sessions" USING btree ("userId","expiresAt");--> statement-breakpoint
CREATE INDEX "admin_web_sessions_active_expiry_index" ON "admin_web_sessions" USING btree ("revokedAt","expiresAt");--> statement-breakpoint
CREATE INDEX "audit_events_actor_index" ON "audit_events" USING btree ("actorUserId");--> statement-breakpoint
CREATE INDEX "audit_events_entity_index" ON "audit_events" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_index" ON "audit_events" USING btree ("correlationId");--> statement-breakpoint
CREATE UNIQUE INDEX "business_application_details_application_unique" ON "business_application_details" USING btree ("applicationId");--> statement-breakpoint
CREATE INDEX "business_commission_policy_active_index" ON "business_commission_policies" USING btree ("organisationId","effectiveFrom","effectiveUntil");--> statement-breakpoint
CREATE INDEX "business_commission_policy_approver_index" ON "business_commission_policies" USING btree ("approvedByUserId");--> statement-breakpoint
CREATE INDEX "business_documents_application_index" ON "business_documents" USING btree ("applicationId","documentType");--> statement-breakpoint
CREATE INDEX "business_documents_reviewer_index" ON "business_documents" USING btree ("reviewedByUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_scope_day_unique" ON "business_hours" USING btree ("scopeType","scopeId","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "business_organisations_application_unique" ON "business_organisations" USING btree ("applicationId");--> statement-breakpoint
CREATE INDEX "business_organisations_owner_index" ON "business_organisations" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "business_organisations_status_index" ON "business_organisations" USING btree ("businessType","status");--> statement-breakpoint
CREATE INDEX "business_outlets_organisation_index" ON "business_outlets" USING btree ("organisationId");--> statement-breakpoint
CREATE INDEX "business_outlets_status_index" ON "business_outlets" USING btree ("city","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_payout_profiles_org_unique" ON "business_payout_profiles" USING btree ("organisationId");--> statement-breakpoint
CREATE UNIQUE INDEX "business_checklist_application_key_unique" ON "business_review_checklists" USING btree ("applicationId","requirementKey");--> statement-breakpoint
CREATE INDEX "business_checklist_status_index" ON "business_review_checklists" USING btree ("applicationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_staff_org_user_unique" ON "business_staff_memberships" USING btree ("organisationId","userId");--> statement-breakpoint
CREATE INDEX "business_staff_user_index" ON "business_staff_memberships" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "cloud_kitchens_organisation_unique" ON "cloud_kitchens" USING btree ("organisationId");--> statement-breakpoint
CREATE INDEX "cloud_kitchens_status_index" ON "cloud_kitchens" USING btree ("city","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cod_collections_order_unique" ON "cod_collections" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "cod_collections_rider_confirmed_index" ON "cod_collections" USING btree ("riderUserId","confirmedAt");--> statement-breakpoint
CREATE INDEX "customer_addresses_user_index" ON "customer_addresses" USING btree ("userId","archivedAt");--> statement-breakpoint
CREATE INDEX "customer_addresses_coordinates_index" ON "customer_addresses" USING btree ("city","latitudeE6","longitudeE6");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_route_snapshots_order_revision_unique" ON "delivery_route_snapshots" USING btree ("orderId","routeRevision");--> statement-breakpoint
CREATE INDEX "delivery_route_snapshots_order_computed_index" ON "delivery_route_snapshots" USING btree ("orderId","computedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "dispatch_score_order_rider_unique" ON "dispatch_score_snapshots" USING btree ("orderId","riderUserId");--> statement-breakpoint
CREATE INDEX "dispatch_score_order_rank_index" ON "dispatch_score_snapshots" USING btree ("orderId","eligibility","score");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_outbox_events_dedupe_unique" ON "domain_outbox_events" USING btree ("deduplicationKey");--> statement-breakpoint
CREATE INDEX "domain_outbox_events_pending_index" ON "domain_outbox_events" USING btree ("domain","processedAt","nextAttemptAt","occurredAt");--> statement-breakpoint
CREATE INDEX "domain_outbox_events_aggregate_index" ON "domain_outbox_events" USING btree ("aggregateType","aggregateId");--> statement-breakpoint
CREATE INDEX "kitchen_brands_kitchen_index" ON "kitchen_brands" USING btree ("cloudKitchenId");--> statement-breakpoint
CREATE INDEX "menu_categories_outlet_index" ON "menu_categories" USING btree ("outletId");--> statement-breakpoint
CREATE INDEX "menu_categories_brand_index" ON "menu_categories" USING btree ("kitchenBrandId");--> statement-breakpoint
CREATE INDEX "menu_items_category_index" ON "menu_items" USING btree ("categoryId","isAvailable");--> statement-breakpoint
CREATE INDEX "menu_modifiers_item_index" ON "menu_modifiers" USING btree ("menuItemId","isAvailable");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_delivery_channel_device_unique" ON "notification_deliveries" USING btree ("notificationId","channel","deviceTokenId");--> statement-breakpoint
CREATE INDEX "notification_deliveries_pending_index" ON "notification_deliveries" USING btree ("channel","status","nextAttemptAt","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_device_tokens_token_unique" ON "notification_device_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "notification_device_tokens_user_status_index" ON "notification_device_tokens" USING btree ("userId","status","lastSeenAt");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_unique" ON "notification_preferences" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "order_item_modifiers_item_index" ON "order_item_modifiers" USING btree ("orderItemId");--> statement-breakpoint
CREATE INDEX "order_items_order_index" ON "order_items" USING btree ("orderId");--> statement-breakpoint
CREATE UNIQUE INDEX "order_kitchen_acknowledgements_order_unique" ON "order_kitchen_acknowledgements" USING btree ("orderId");--> statement-breakpoint
CREATE UNIQUE INDEX "order_reviews_order_unique" ON "order_reviews" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "order_reviews_organisation_visibility_created_index" ON "order_reviews" USING btree ("organisationId","visibility","createdAt");--> statement-breakpoint
CREATE INDEX "order_reviews_customer_created_index" ON "order_reviews" USING btree ("customerUserId","createdAt");--> statement-breakpoint
CREATE INDEX "order_status_history_order_index" ON "order_status_history" USING btree ("orderId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_public_id_unique" ON "orders" USING btree ("publicId");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_customer_idempotency_unique" ON "orders" USING btree ("customerUserId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "orders_customer_created_index" ON "orders" USING btree ("customerUserId","placedAt");--> statement-breakpoint
CREATE INDEX "orders_business_status_index" ON "orders" USING btree ("organisationId","status","placedAt");--> statement-breakpoint
CREATE INDEX "orders_settlement_status_index" ON "orders" USING btree ("organisationId","settlementStatus","placedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_ledger_entries_reference_unique" ON "payment_ledger_entries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payment_ledger_business_status_created_index" ON "payment_ledger_entries" USING btree ("organisationId","partyType","status","createdAt");--> statement-breakpoint
CREATE INDEX "payment_ledger_rider_status_created_index" ON "payment_ledger_entries" USING btree ("riderUserId","partyType","status","createdAt");--> statement-breakpoint
CREATE INDEX "payment_ledger_order_created_index" ON "payment_ledger_entries" USING btree ("orderId","createdAt");--> statement-breakpoint
CREATE INDEX "production_stations_kitchen_index" ON "production_stations" USING btree ("cloudKitchenId");--> statement-breakpoint
CREATE INDEX "refund_requests_customer_created_index" ON "refund_requests" USING btree ("customerUserId","createdAt");--> statement-breakpoint
CREATE INDEX "refund_requests_order_status_index" ON "refund_requests" USING btree ("orderId","status");--> statement-breakpoint
CREATE INDEX "refund_requests_status_created_index" ON "refund_requests" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "review_photo_reports_photo_reporter_index" ON "review_photo_reports" USING btree ("photoId","reporterUserId","status");--> statement-breakpoint
CREATE INDEX "review_photo_reports_status_created_index" ON "review_photo_reports" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "review_photos_review_privacy_index" ON "review_photos" USING btree ("reviewId","privacy","createdAt");--> statement-breakpoint
CREATE INDEX "review_photos_customer_index" ON "review_photos" USING btree ("customerUserId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_assignments_order_unique" ON "rider_assignments" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "rider_assignments_rider_status_index" ON "rider_assignments" USING btree ("riderUserId","assignedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_availability_rider_unique" ON "rider_availability" USING btree ("riderUserId");--> statement-breakpoint
CREATE INDEX "rider_availability_status_updated_index" ON "rider_availability" USING btree ("status","updatedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_cash_entries_order_type_unique" ON "rider_cash_account_entries" USING btree ("orderId","entryType");--> statement-breakpoint
CREATE INDEX "rider_cash_entries_rider_created_index" ON "rider_cash_account_entries" USING btree ("riderUserId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_cash_accounts_rider_unique" ON "rider_cash_accounts" USING btree ("riderUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_cash_receipts_code_unique" ON "rider_cash_settlement_receipts" USING btree ("receiptCode");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_cash_receipts_entry_unique" ON "rider_cash_settlement_receipts" USING btree ("cashAccountEntryId");--> statement-breakpoint
CREATE INDEX "rider_cash_receipts_rider_issued_index" ON "rider_cash_settlement_receipts" USING btree ("riderUserId","issuedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_command_receipts_rider_key_unique" ON "rider_command_receipts" USING btree ("riderUserId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "rider_command_receipts_rider_status_index" ON "rider_command_receipts" USING btree ("riderUserId","status","receivedAt");--> statement-breakpoint
CREATE INDEX "rider_command_receipts_order_index" ON "rider_command_receipts" USING btree ("orderId","receivedAt");--> statement-breakpoint
CREATE INDEX "rider_location_updates_order_created_index" ON "rider_location_updates" USING btree ("orderId","createdAt");--> statement-breakpoint
CREATE INDEX "rider_location_updates_rider_created_index" ON "rider_location_updates" USING btree ("riderUserId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_tracking_sessions_order_unique" ON "rider_tracking_sessions" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "rider_tracking_sessions_rider_status_index" ON "rider_tracking_sessions" USING btree ("riderUserId","status","updatedAt");--> statement-breakpoint
CREATE INDEX "service_zones_organisation_index" ON "service_zones" USING btree ("organisationId");--> statement-breakpoint
CREATE INDEX "service_zones_city_index" ON "service_zones" USING btree ("city","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_ledger_order_party_type_unique" ON "settlement_ledger_entries" USING btree ("orderId","partyType","entryType");--> statement-breakpoint
CREATE INDEX "settlement_ledger_org_status_index" ON "settlement_ledger_entries" USING btree ("organisationId","status","createdAt");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_created_index" ON "support_ticket_messages" USING btree ("ticketId","createdAt");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_author_created_index" ON "support_ticket_messages" USING btree ("authorUserId","createdAt");--> statement-breakpoint
CREATE INDEX "support_tickets_customer_created_index" ON "support_tickets" USING btree ("customerUserId","createdAt");--> statement-breakpoint
CREATE INDEX "support_tickets_status_created_index" ON "support_tickets" USING btree ("status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notifications_dedupe_unique" ON "user_notifications" USING btree ("deduplicationKey");--> statement-breakpoint
CREATE INDEX "user_notifications_recipient_read_created_index" ON "user_notifications" USING btree ("recipientUserId","readAt","createdAt");--> statement-breakpoint
CREATE INDEX "user_notifications_order_created_index" ON "user_notifications" USING btree ("orderId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_applications_user_workspace_unique" ON "workspace_applications" USING btree ("userId","workspaceType");--> statement-breakpoint
CREATE INDEX "workspace_applications_status_index" ON "workspace_applications" USING btree ("workspaceType","status");--> statement-breakpoint
CREATE INDEX "workspace_applications_reviewer_index" ON "workspace_applications" USING btree ("reviewedByUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_user_workspace_unique" ON "workspace_memberships" USING btree ("userId","workspaceType");--> statement-breakpoint
CREATE INDEX "workspace_memberships_user_index" ON "workspace_memberships" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "workspace_memberships_status_index" ON "workspace_memberships" USING btree ("workspaceType","status");