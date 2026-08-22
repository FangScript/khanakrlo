CREATE TABLE `review_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`mimeType` varchar(40) NOT NULL,
	`byteSize` int NOT NULL,
	`privacy` enum('public','business_only','platform_only') NOT NULL DEFAULT 'business_only',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `review_photos_review_privacy_index` ON `review_photos` (`reviewId`,`privacy`,`createdAt`);--> statement-breakpoint
CREATE INDEX `review_photos_customer_index` ON `review_photos` (`customerUserId`,`createdAt`);