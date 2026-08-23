CREATE TABLE `admin_web_security_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` enum('repeated_mfa_failures','repeated_ip_denials') NOT NULL,
	`scopeKey` varchar(160) NOT NULL,
	`lastEventCount` int NOT NULL,
	`lastDeliveredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_web_security_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_web_security_alert_scope_unique` UNIQUE(`alertType`,`scopeKey`)
);
--> statement-breakpoint
CREATE INDEX `admin_web_security_alert_delivered_index` ON `admin_web_security_alerts` (`lastDeliveredAt`);