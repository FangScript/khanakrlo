CREATE TABLE `admin_ai_triage_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`submittedByUserId` int NOT NULL,
	`outcome` enum('confirmed_accurate','false_positive','false_negative','needs_more_evidence') NOT NULL,
	`note` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_ai_triage_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_ai_triage_feedback_assessment_created_index` ON `admin_ai_triage_feedback` (`assessmentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_ai_triage_feedback_outcome_created_index` ON `admin_ai_triage_feedback` (`outcome`,`createdAt`);