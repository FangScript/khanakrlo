CREATE TABLE `domain_outbox_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(80) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`aggregateType` varchar(80) NOT NULL,
	`aggregateId` varchar(80) NOT NULL,
	`payload` text NOT NULL,
	`deduplicationKey` varchar(180) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`processedAt` timestamp,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domain_outbox_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `domain_outbox_events_dedupe_unique` UNIQUE(`deduplicationKey`)
);
--> statement-breakpoint
CREATE INDEX `domain_outbox_events_pending_index` ON `domain_outbox_events` (`domain`,`processedAt`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `domain_outbox_events_aggregate_index` ON `domain_outbox_events` (`aggregateType`,`aggregateId`);