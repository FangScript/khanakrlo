CREATE TABLE `rider_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`riderUserId` int NOT NULL,
	`assignedByUserId` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rider_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_assignments_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `rider_location_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`riderUserId` int NOT NULL,
	`latitudeE6` int NOT NULL,
	`longitudeE6` int NOT NULL,
	`accuracyMeters` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rider_location_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `rider_assignments_rider_status_index` ON `rider_assignments` (`riderUserId`,`assignedAt`);--> statement-breakpoint
CREATE INDEX `rider_location_updates_order_created_index` ON `rider_location_updates` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `rider_location_updates_rider_created_index` ON `rider_location_updates` (`riderUserId`,`createdAt`);