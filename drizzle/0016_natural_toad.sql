CREATE TABLE `rider_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riderUserId` int NOT NULL,
	`status` enum('online','offline') NOT NULL DEFAULT 'offline',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rider_availability_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_availability_rider_unique` UNIQUE(`riderUserId`)
);
--> statement-breakpoint
CREATE INDEX `rider_availability_status_updated_index` ON `rider_availability` (`status`,`updatedAt`);