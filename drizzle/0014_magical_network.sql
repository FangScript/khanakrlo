CREATE TABLE `order_kitchen_acknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`acknowledgedByUserId` int NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_kitchen_acknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_kitchen_acknowledgements_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `offerStatus` enum('offered','accepted','declined','expired') DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `offerExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `respondedAt` timestamp;