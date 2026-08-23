CREATE TABLE `dispatch_score_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`riderUserId` int NOT NULL,
	`score` int NOT NULL,
	`activeWorkload` int NOT NULL,
	`availabilityAgeSeconds` int NOT NULL,
	`eligibility` enum('eligible','ineligible') NOT NULL,
	`explanationJson` text NOT NULL,
	`computedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dispatch_score_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `dispatch_score_order_rider_unique` UNIQUE(`orderId`,`riderUserId`)
);
--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` int NOT NULL,
	`deviceTokenId` int,
	`channel` enum('in_app','expo_push') NOT NULL,
	`status` enum('queued','delivered','failed','suppressed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`providerMessageId` varchar(160),
	`lastError` varchar(500),
	`nextAttemptAt` timestamp,
	`deliveredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_delivery_channel_device_unique` UNIQUE(`notificationId`,`channel`,`deviceTokenId`)
);
--> statement-breakpoint
CREATE TABLE `notification_device_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('expo') NOT NULL DEFAULT 'expo',
	`token` varchar(255) NOT NULL,
	`platform` enum('ios','android') NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`disabledAt` timestamp,
	`failureReason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_device_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_device_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `payment_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`organisationId` int NOT NULL,
	`riderUserId` int,
	`refundRequestId` int,
	`partyType` enum('customer','business','rider','platform') NOT NULL,
	`entryType` enum('order_total_due','cash_collected','business_payable','platform_commission','rider_cash_custody','refund_requested','refund_approved','refund_settled','refund_rejected') NOT NULL,
	`amountMinor` int NOT NULL,
	`status` enum('pending','approved','settled','failed','void') NOT NULL DEFAULT 'pending',
	`reference` varchar(180) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_ledger_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_ledger_entries_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `refund_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`supportTicketId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`requestedMinor` int NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`status` enum('requested','approved','settled','rejected','cancelled') NOT NULL DEFAULT 'requested',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`settledByUserId` int,
	`settledAt` timestamp,
	`decisionNote` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refund_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rider_command_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riderUserId` int NOT NULL,
	`orderId` int,
	`commandType` enum('offer_decision','transition','cod_collection','location_update','availability') NOT NULL,
	`idempotencyKey` varchar(120) NOT NULL,
	`payloadJson` text NOT NULL,
	`status` enum('processing','succeeded','failed','rejected') NOT NULL DEFAULT 'processing',
	`attempts` int NOT NULL DEFAULT 1,
	`resultJson` text,
	`errorCode` varchar(80),
	`errorMessage` varchar(500),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rider_command_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_command_receipts_rider_key_unique` UNIQUE(`riderUserId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`authorUserId` int,
	`authorType` enum('customer','admin','system') NOT NULL,
	`visibility` enum('customer_visible','internal') NOT NULL DEFAULT 'customer_visible',
	`body` varchar(2000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientUserId` int NOT NULL,
	`category` enum('order','rider_offer','support','finance','system') NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` varchar(500) NOT NULL,
	`route` varchar(255),
	`orderId` int,
	`supportTicketId` int,
	`deduplicationKey` varchar(180) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_notifications_dedupe_unique` UNIQUE(`deduplicationKey`)
);
--> statement-breakpoint
CREATE INDEX `dispatch_score_order_rank_index` ON `dispatch_score_snapshots` (`orderId`,`eligibility`,`score`);--> statement-breakpoint
CREATE INDEX `notification_deliveries_pending_index` ON `notification_deliveries` (`channel`,`status`,`nextAttemptAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_device_tokens_user_status_index` ON `notification_device_tokens` (`userId`,`status`,`lastSeenAt`);--> statement-breakpoint
CREATE INDEX `payment_ledger_business_status_created_index` ON `payment_ledger_entries` (`organisationId`,`partyType`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_ledger_rider_status_created_index` ON `payment_ledger_entries` (`riderUserId`,`partyType`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_ledger_order_created_index` ON `payment_ledger_entries` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `refund_requests_customer_created_index` ON `refund_requests` (`customerUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `refund_requests_order_status_index` ON `refund_requests` (`orderId`,`status`);--> statement-breakpoint
CREATE INDEX `refund_requests_status_created_index` ON `refund_requests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `rider_command_receipts_rider_status_index` ON `rider_command_receipts` (`riderUserId`,`status`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `rider_command_receipts_order_index` ON `rider_command_receipts` (`orderId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `support_ticket_messages_ticket_created_index` ON `support_ticket_messages` (`ticketId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_ticket_messages_author_created_index` ON `support_ticket_messages` (`authorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_notifications_recipient_read_created_index` ON `user_notifications` (`recipientUserId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_notifications_order_created_index` ON `user_notifications` (`orderId`,`createdAt`);