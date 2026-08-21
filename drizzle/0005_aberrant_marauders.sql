DROP INDEX `domain_outbox_events_pending_index` ON `domain_outbox_events`;--> statement-breakpoint
ALTER TABLE `domain_outbox_events` ADD `nextAttemptAt` timestamp;--> statement-breakpoint
CREATE INDEX `domain_outbox_events_pending_index` ON `domain_outbox_events` (`domain`,`processedAt`,`nextAttemptAt`,`occurredAt`);