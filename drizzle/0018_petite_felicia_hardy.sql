CREATE TABLE `rider_cash_settlement_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riderUserId` int NOT NULL,
	`riderCashAccountId` int NOT NULL,
	`cashAccountEntryId` int NOT NULL,
	`receiptCode` varchar(80) NOT NULL,
	`amountMinor` int NOT NULL,
	`balanceAfterMinor` int NOT NULL,
	`reconciledOrderIdsJson` text NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rider_cash_settlement_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_cash_receipts_code_unique` UNIQUE(`receiptCode`),
	CONSTRAINT `rider_cash_receipts_entry_unique` UNIQUE(`cashAccountEntryId`)
);
--> statement-breakpoint
CREATE INDEX `rider_cash_receipts_rider_issued_index` ON `rider_cash_settlement_receipts` (`riderUserId`,`issuedAt`);