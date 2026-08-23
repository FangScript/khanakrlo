CREATE TABLE `admin_case_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`assignedByUserId` int NOT NULL,
	`assignedToUserId` int NOT NULL,
	`assignmentType` enum('assigned','reassigned') NOT NULL,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_case_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_case_escalations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`severity` enum('at_risk','breached') NOT NULL,
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedByUserId` int,
	`acknowledgedAt` timestamp,
	CONSTRAINT `admin_case_escalations_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_case_escalations_case_severity_unique` UNIQUE(`caseId`,`severity`)
);
--> statement-breakpoint
CREATE INDEX `admin_case_assignments_case_created_index` ON `admin_case_assignments` (`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_case_assignments_assignee_created_index` ON `admin_case_assignments` (`assignedToUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_case_escalations_acknowledged_triggered_index` ON `admin_case_escalations` (`acknowledgedAt`,`triggeredAt`);