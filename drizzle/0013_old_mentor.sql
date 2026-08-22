CREATE TABLE `review_photo_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`photoId` int NOT NULL,
	`reporterUserId` int NOT NULL,
	`reason` enum('nudity','hate_or_harassment','violence','spam','other') NOT NULL,
	`details` varchar(500),
	`status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_photo_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `review_photos` ADD `removedAt` timestamp;--> statement-breakpoint
ALTER TABLE `review_photos` ADD `removedByUserId` int;--> statement-breakpoint
CREATE INDEX `review_photo_reports_photo_reporter_index` ON `review_photo_reports` (`photoId`,`reporterUserId`,`status`);--> statement-breakpoint
CREATE INDEX `review_photo_reports_status_created_index` ON `review_photo_reports` (`status`,`createdAt`);