CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderUpdatesEnabled` boolean NOT NULL DEFAULT true,
	`supportUpdatesEnabled` boolean NOT NULL DEFAULT true,
	`promotionsEnabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerUserId` int NOT NULL,
	`orderId` int,
	`category` enum('order','delivery','payment','account','other') NOT NULL,
	`subject` varchar(140) NOT NULL,
	`message` varchar(1500) NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `support_tickets_customer_created_index` ON `support_tickets` (`customerUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_tickets_status_created_index` ON `support_tickets` (`status`,`createdAt`);