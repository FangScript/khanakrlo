CREATE TABLE `admin_operational_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseType` enum('business_emergency','rider_remittance') NOT NULL,
	`targetId` int NOT NULL,
	`status` enum('open','in_progress','resolved','dismissed') NOT NULL DEFAULT 'open',
	`priority` enum('normal','high','critical') NOT NULL DEFAULT 'normal',
	`reason` varchar(500) NOT NULL,
	`internalNote` text,
	`assignedAdminUserId` int,
	`openedByUserId` int NOT NULL,
	`resolvedByUserId` int,
	`reviewDueAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_operational_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_staff_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`staffRole` enum('support_agent','moderation_agent','finance_operator','senior_operations') NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`grantedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_staff_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_staff_roles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `admin_operational_cases_status_created_index` ON `admin_operational_cases` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_operational_cases_target_index` ON `admin_operational_cases` (`caseType`,`targetId`);--> statement-breakpoint
CREATE INDEX `admin_operational_cases_assignee_index` ON `admin_operational_cases` (`assignedAdminUserId`,`status`);--> statement-breakpoint
CREATE INDEX `admin_staff_roles_role_status_index` ON `admin_staff_roles` (`staffRole`,`status`);