CREATE TABLE `account_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`givenName` varchar(100),
	`phoneE164` varchar(20),
	`phoneVerifiedAt` timestamp,
	`defaultCity` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_profiles_user_unique` UNIQUE(`userId`),
	CONSTRAINT `account_profiles_phone_unique` UNIQUE(`phoneE164`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80) NOT NULL,
	`action` varchar(120) NOT NULL,
	`previousValue` text,
	`nextValue` text,
	`correlationId` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workspaceType` enum('business','rider') NOT NULL,
	`businessType` enum('restaurant','cloud_kitchen'),
	`status` enum('draft','submitted','changes_required','approved','suspended') NOT NULL DEFAULT 'draft',
	`displayName` varchar(160),
	`phoneE164` varchar(20),
	`city` varchar(120),
	`reviewNote` varchar(1000),
	`submittedAt` timestamp,
	`reviewedAt` timestamp,
	`reviewedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_applications_user_workspace_unique` UNIQUE(`userId`,`workspaceType`)
);
--> statement-breakpoint
CREATE TABLE `workspace_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workspaceType` enum('customer','business','rider') NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`applicationId` int,
	`approvedAt` timestamp,
	`suspendedAt` timestamp,
	`suspensionReason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_memberships_user_workspace_unique` UNIQUE(`userId`,`workspaceType`)
);
--> statement-breakpoint
CREATE INDEX `audit_events_actor_index` ON `audit_events` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_index` ON `audit_events` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_events_correlation_index` ON `audit_events` (`correlationId`);--> statement-breakpoint
CREATE INDEX `workspace_applications_status_index` ON `workspace_applications` (`workspaceType`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_applications_reviewer_index` ON `workspace_applications` (`reviewedByUserId`);--> statement-breakpoint
CREATE INDEX `workspace_memberships_user_index` ON `workspace_memberships` (`userId`);--> statement-breakpoint
CREATE INDEX `workspace_memberships_status_index` ON `workspace_memberships` (`workspaceType`,`status`);