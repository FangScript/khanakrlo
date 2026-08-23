CREATE TABLE `admin_credential_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`host` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_credential_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_credential_sessions_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `admin_staff_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(80) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`passwordChangedAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_staff_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_staff_credentials_user_unique` UNIQUE(`userId`),
	CONSTRAINT `admin_staff_credentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `admin_credential_sessions_user_expiry_index` ON `admin_credential_sessions` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `admin_staff_credentials_status_index` ON `admin_staff_credentials` (`status`);