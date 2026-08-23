CREATE TABLE `admin_credential_login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(80) NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`success` boolean NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_credential_login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_credential_login_username_created_index` ON `admin_credential_login_attempts` (`username`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_credential_login_ip_created_index` ON `admin_credential_login_attempts` (`ipAddress`,`createdAt`);