CREATE TABLE `admin_ip_allowlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cidr` varchar(64) NOT NULL,
	`label` varchar(120) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_ip_allowlist_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_ip_allowlist_cidr_unique` UNIQUE(`cidr`)
);
--> statement-breakpoint
CREATE TABLE `admin_mfa_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secretCiphertext` text NOT NULL,
	`status` enum('pending','active','disabled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	`disabledAt` timestamp,
	CONSTRAINT `admin_mfa_enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_mfa_enrollment_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `admin_mfa_recovery_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_mfa_recovery_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_mfa_recovery_hash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `admin_web_login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`eventType` enum('oauth_authenticated','mfa_enrollment_started','mfa_enrollment_confirmed','mfa_succeeded','mfa_failed','recovery_code_used','ip_denied','host_denied','session_revoked') NOT NULL,
	`success` boolean NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`host` varchar(255) NOT NULL,
	`userAgent` varchar(500),
	`reason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_web_login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_web_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`host` varchar(255) NOT NULL,
	`userAgent` varchar(500),
	`mfaVerifiedAt` timestamp NOT NULL,
	`lastSeenAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`revokedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_web_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_web_sessions_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `admin_ip_allowlist_status_created_index` ON `admin_ip_allowlist` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_mfa_enrollment_status_created_index` ON `admin_mfa_enrollments` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_mfa_recovery_enrollment_used_index` ON `admin_mfa_recovery_codes` (`enrollmentId`,`usedAt`);--> statement-breakpoint
CREATE INDEX `admin_web_login_user_created_index` ON `admin_web_login_attempts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_web_login_event_created_index` ON `admin_web_login_attempts` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_web_sessions_user_expiry_index` ON `admin_web_sessions` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `admin_web_sessions_active_expiry_index` ON `admin_web_sessions` (`revokedAt`,`expiresAt`);