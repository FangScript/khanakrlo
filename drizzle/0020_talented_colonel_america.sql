CREATE TABLE `admin_ai_triage_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectType` enum('photo_report','business_emergency') NOT NULL,
	`subjectId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`model` varchar(120) NOT NULL,
	`inputSummary` text NOT NULL,
	`assessmentSummary` varchar(1000) NOT NULL,
	`confidenceBps` int NOT NULL,
	`recommendedPriority` enum('normal','high','critical') NOT NULL,
	`suggestedDisposition` enum('retain_for_human_review','prioritize_review','additional_evidence_needed') NOT NULL,
	`safetySignalsJson` text NOT NULL,
	`reviewState` enum('pending_human_review','acknowledged','overridden') NOT NULL DEFAULT 'pending_human_review',
	`humanReviewedByUserId` int,
	`humanReviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_ai_triage_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_staff_role_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetUserId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`previousRole` enum('support_agent','moderation_agent','finance_operator','senior_operations'),
	`nextRole` enum('support_agent','moderation_agent','finance_operator','senior_operations'),
	`action` enum('provisioned','delegated','deactivated','reactivated') NOT NULL,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_staff_role_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_ai_triage_subject_created_index` ON `admin_ai_triage_assessments` (`subjectType`,`subjectId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_ai_triage_review_state_created_index` ON `admin_ai_triage_assessments` (`reviewState`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_staff_role_events_target_created_index` ON `admin_staff_role_events` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_staff_role_events_actor_created_index` ON `admin_staff_role_events` (`actorUserId`,`createdAt`);