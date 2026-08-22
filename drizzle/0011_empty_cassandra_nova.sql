CREATE TABLE `order_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`organisationId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`rating` int NOT NULL,
	`publicComment` varchar(1000),
	`privateFeedback` varchar(1000),
	`feedbackTopicsJson` varchar(500) NOT NULL DEFAULT '[]',
	`visibility` enum('published','hidden') NOT NULL DEFAULT 'published',
	`businessReply` varchar(1000),
	`businessRepliedAt` timestamp,
	`moderatedByUserId` int,
	`moderatedAt` timestamp,
	`moderationNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_reviews_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE INDEX `order_reviews_organisation_visibility_created_index` ON `order_reviews` (`organisationId`,`visibility`,`createdAt`);--> statement-breakpoint
CREATE INDEX `order_reviews_customer_created_index` ON `order_reviews` (`customerUserId`,`createdAt`);