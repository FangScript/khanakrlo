CREATE TABLE `rider_cash_account_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riderCashAccountId` int NOT NULL,
	`riderUserId` int NOT NULL,
	`orderId` int,
	`entryType` enum('commission_reserved','commission_released','cash_collected','cash_variance','settlement_adjustment') NOT NULL,
	`amountMinor` int NOT NULL,
	`balanceAfterMinor` int NOT NULL,
	`reference` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rider_cash_account_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_cash_entries_order_type_unique` UNIQUE(`orderId`,`entryType`)
);
--> statement-breakpoint
CREATE TABLE `rider_cash_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riderUserId` int NOT NULL,
	`balanceMinor` int NOT NULL DEFAULT 0,
	`status` enum('active','restricted','suspended') NOT NULL DEFAULT 'active',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rider_cash_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_cash_accounts_rider_unique` UNIQUE(`riderUserId`)
);
--> statement-breakpoint
CREATE INDEX `rider_cash_entries_rider_created_index` ON `rider_cash_account_entries` (`riderUserId`,`createdAt`);