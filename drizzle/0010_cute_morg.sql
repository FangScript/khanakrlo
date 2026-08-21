CREATE TABLE `business_commission_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organisationId` int NOT NULL,
	`commissionRateBps` int NOT NULL,
	`revenueBase` enum('item_subtotal_after_discount') NOT NULL DEFAULT 'item_subtotal_after_discount',
	`taxTreatment` varchar(120) NOT NULL DEFAULT 'pilot_pending',
	`settlementCadence` varchar(80) NOT NULL DEFAULT 'manual_pilot',
	`effectiveFrom` timestamp NOT NULL DEFAULT (now()),
	`effectiveUntil` timestamp,
	`approvedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_commission_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cod_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`riderUserId` int NOT NULL,
	`expectedMinor` int NOT NULL,
	`collectedMinor` int NOT NULL,
	`varianceMinor` int NOT NULL,
	`varianceReason` varchar(500),
	`status` enum('collected','short','over') NOT NULL,
	`confirmedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cod_collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `cod_collections_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `settlement_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`organisationId` int NOT NULL,
	`partyType` enum('platform','restaurant','rider') NOT NULL,
	`entryType` enum('commission','restaurant_payable','rider_cash_custody','collection_variance') NOT NULL,
	`amountMinor` int NOT NULL,
	`status` enum('open','reconciled','void') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settlement_ledger_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `settlement_ledger_order_party_type_unique` UNIQUE(`orderId`,`partyType`,`entryType`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `commissionPolicyId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `commissionRateBps` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `commissionableSubtotalMinor` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `platformCommissionMinor` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `restaurantPayableMinor` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `riderCashCustodyMinor` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `settlementStatus` enum('unsettled','reconciled','variance','waived') DEFAULT 'unsettled' NOT NULL;--> statement-breakpoint
CREATE INDEX `business_commission_policy_active_index` ON `business_commission_policies` (`organisationId`,`effectiveFrom`,`effectiveUntil`);--> statement-breakpoint
CREATE INDEX `business_commission_policy_approver_index` ON `business_commission_policies` (`approvedByUserId`);--> statement-breakpoint
CREATE INDEX `cod_collections_rider_confirmed_index` ON `cod_collections` (`riderUserId`,`confirmedAt`);--> statement-breakpoint
CREATE INDEX `settlement_ledger_org_status_index` ON `settlement_ledger_entries` (`organisationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_settlement_status_index` ON `orders` (`organisationId`,`settlementStatus`,`placedAt`);
--> statement-breakpoint
INSERT INTO `business_commission_policies` (`organisationId`,`commissionRateBps`,`revenueBase`,`taxTreatment`,`settlementCadence`,`effectiveFrom`)
SELECT `id`, 1200, 'item_subtotal_after_discount', 'pilot_pending', 'manual_pilot', NOW()
FROM `business_organisations`;
--> statement-breakpoint
UPDATE `orders`
SET `commissionRateBps` = 1200,
    `commissionableSubtotalMinor` = GREATEST(0, `itemSubtotalMinor` - `discountMinor`),
    `platformCommissionMinor` = ROUND(GREATEST(0, `itemSubtotalMinor` - `discountMinor`) * 1200 / 10000),
    `restaurantPayableMinor` = GREATEST(0, `itemSubtotalMinor` - `discountMinor`) - ROUND(GREATEST(0, `itemSubtotalMinor` - `discountMinor`) * 1200 / 10000),
    `riderCashCustodyMinor` = `totalMinor`
WHERE `commissionRateBps` = 0;
