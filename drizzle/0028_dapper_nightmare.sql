CREATE TABLE `delivery_route_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`status` enum('estimated','provider_unavailable','failed') NOT NULL DEFAULT 'estimated',
	`distanceMeters` int,
	`durationSeconds` int,
	`etaMinutes` int,
	`provider` varchar(80) NOT NULL,
	`routeRevision` varchar(100) NOT NULL,
	`responseMetadataJson` varchar(2000) NOT NULL DEFAULT '{}',
	`computedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_route_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_route_snapshots_order_revision_unique` UNIQUE(`orderId`,`routeRevision`)
);
--> statement-breakpoint
CREATE TABLE `rider_tracking_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`riderUserId` int NOT NULL,
	`status` enum('active','paused','ended') NOT NULL DEFAULT 'active',
	`consentGrantedAt` timestamp NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`pausedAt` timestamp,
	`endedAt` timestamp,
	`endedReason` enum('delivery_completed','order_cancelled','rider_paused','rider_stopped','session_replaced'),
	`lastLocationAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rider_tracking_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_tracking_sessions_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
ALTER TABLE `rider_location_updates` ADD `source` enum('foreground','background') DEFAULT 'foreground' NOT NULL;--> statement-breakpoint
ALTER TABLE `rider_location_updates` ADD `deviceObservedAt` timestamp;--> statement-breakpoint
CREATE INDEX `delivery_route_snapshots_order_computed_index` ON `delivery_route_snapshots` (`orderId`,`computedAt`);--> statement-breakpoint
CREATE INDEX `rider_tracking_sessions_rider_status_index` ON `rider_tracking_sessions` (`riderUserId`,`status`,`updatedAt`);
