CREATE TABLE `business_application_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`legalName` varchar(180),
	`displayName` varchar(160),
	`supportPhone` varchar(20),
	`city` varchar(120),
	`addressLine1` varchar(255),
	`description` text,
	`pickupInstructions` varchar(500),
	`prepTimeMinutes` int,
	`openingTime` varchar(5),
	`closingTime` varchar(5),
	`cuisine` varchar(120),
	`cloudKitchenPayload` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_application_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_application_details_application_unique` UNIQUE(`applicationId`)
);
--> statement-breakpoint
CREATE TABLE `business_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`organisationId` int,
	`uploadedByUserId` int NOT NULL,
	`documentType` enum('owner_identity','business_registration','tax_record','payout_evidence','outlet_evidence','food_safety','menu_evidence') NOT NULL,
	`status` enum('uploaded','accepted','changes_required','rejected') NOT NULL DEFAULT 'uploaded',
	`storageKey` varchar(500) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`reviewerNote` varchar(1000),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scopeType` enum('organisation','outlet','cloud_kitchen','brand') NOT NULL,
	`scopeId` int NOT NULL,
	`weekday` int NOT NULL,
	`opensAt` varchar(5),
	`closesAt` varchar(5),
	`isClosed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_hours_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_hours_scope_day_unique` UNIQUE(`scopeType`,`scopeId`,`weekday`)
);
--> statement-breakpoint
CREATE TABLE `business_organisations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`businessType` enum('restaurant','cloud_kitchen') NOT NULL,
	`legalName` varchar(180) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`supportPhone` varchar(20) NOT NULL,
	`city` varchar(120) NOT NULL,
	`status` enum('draft','pending_review','approved','live','paused','suspended') NOT NULL DEFAULT 'approved',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_organisations_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_organisations_application_unique` UNIQUE(`applicationId`)
);
--> statement-breakpoint
CREATE TABLE `business_outlets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`cuisine` varchar(120) NOT NULL,
	`description` text,
	`addressLine1` varchar(255) NOT NULL,
	`city` varchar(120) NOT NULL,
	`latitudeE6` int,
	`longitudeE6` int,
	`pickupInstructions` varchar(500),
	`prepTimeMinutes` int NOT NULL,
	`acceptsDelivery` boolean NOT NULL DEFAULT true,
	`isPaused` boolean NOT NULL DEFAULT false,
	`status` enum('draft','pending_review','approved','live','paused','suspended') NOT NULL DEFAULT 'approved',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_outlets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_payout_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`provider` varchar(80),
	`accountHolderName` varchar(160),
	`accountReference` varchar(160),
	`status` enum('missing','complete','changes_required','accepted') NOT NULL DEFAULT 'missing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_payout_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_payout_profiles_org_unique` UNIQUE(`organisationId`)
);
--> statement-breakpoint
CREATE TABLE `business_review_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`requirementKey` varchar(120) NOT NULL,
	`status` enum('missing','complete','changes_required','accepted') NOT NULL DEFAULT 'missing',
	`note` varchar(1000),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_review_checklists_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_checklist_application_key_unique` UNIQUE(`applicationId`,`requirementKey`)
);
--> statement-breakpoint
CREATE TABLE `business_staff_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`userId` int NOT NULL,
	`staffRole` enum('owner','manager','counter','kitchen_manager','station_lead','dispatcher','finance_viewer') NOT NULL,
	`outletId` int,
	`cloudKitchenId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_staff_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_staff_org_user_unique` UNIQUE(`organisationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `cloud_kitchens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`addressLine1` varchar(255) NOT NULL,
	`city` varchar(120) NOT NULL,
	`pickupInstructions` varchar(500),
	`capacityLimit` int NOT NULL,
	`activeOrderLimit` int NOT NULL,
	`isPaused` boolean NOT NULL DEFAULT false,
	`status` enum('draft','pending_review','approved','live','paused','suspended') NOT NULL DEFAULT 'approved',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cloud_kitchens_id` PRIMARY KEY(`id`),
	CONSTRAINT `cloud_kitchens_organisation_unique` UNIQUE(`organisationId`)
);
--> statement-breakpoint
CREATE TABLE `kitchen_brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cloudKitchenId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`cuisine` varchar(120) NOT NULL,
	`description` text,
	`prepTimeMinutes` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kitchen_brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outletId` int,
	`kitchenBrandId` int,
	`name` varchar(120) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`priceMinor` int NOT NULL,
	`prepTimeMinutes` int NOT NULL,
	`imageKey` varchar(500),
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_modifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menuItemId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`priceMinor` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT false,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_modifiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_stations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cloudKitchenId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`capacityLimit` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_stations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`outletId` int,
	`cloudKitchenId` int,
	`name` varchar(120) NOT NULL,
	`city` varchar(120) NOT NULL,
	`deliveryFeeMinor` int NOT NULL DEFAULT 0,
	`minimumOrderMinor` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `business_documents_application_index` ON `business_documents` (`applicationId`,`documentType`);--> statement-breakpoint
CREATE INDEX `business_documents_reviewer_index` ON `business_documents` (`reviewedByUserId`);--> statement-breakpoint
CREATE INDEX `business_organisations_owner_index` ON `business_organisations` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `business_organisations_status_index` ON `business_organisations` (`businessType`,`status`);--> statement-breakpoint
CREATE INDEX `business_outlets_organisation_index` ON `business_outlets` (`organisationId`);--> statement-breakpoint
CREATE INDEX `business_outlets_status_index` ON `business_outlets` (`city`,`status`);--> statement-breakpoint
CREATE INDEX `business_checklist_status_index` ON `business_review_checklists` (`applicationId`,`status`);--> statement-breakpoint
CREATE INDEX `business_staff_user_index` ON `business_staff_memberships` (`userId`);--> statement-breakpoint
CREATE INDEX `cloud_kitchens_status_index` ON `cloud_kitchens` (`city`,`status`);--> statement-breakpoint
CREATE INDEX `kitchen_brands_kitchen_index` ON `kitchen_brands` (`cloudKitchenId`);--> statement-breakpoint
CREATE INDEX `menu_categories_outlet_index` ON `menu_categories` (`outletId`);--> statement-breakpoint
CREATE INDEX `menu_categories_brand_index` ON `menu_categories` (`kitchenBrandId`);--> statement-breakpoint
CREATE INDEX `menu_items_category_index` ON `menu_items` (`categoryId`,`isAvailable`);--> statement-breakpoint
CREATE INDEX `menu_modifiers_item_index` ON `menu_modifiers` (`menuItemId`,`isAvailable`);--> statement-breakpoint
CREATE INDEX `production_stations_kitchen_index` ON `production_stations` (`cloudKitchenId`);--> statement-breakpoint
CREATE INDEX `service_zones_organisation_index` ON `service_zones` (`organisationId`);--> statement-breakpoint
CREATE INDEX `service_zones_city_index` ON `service_zones` (`city`,`isActive`);