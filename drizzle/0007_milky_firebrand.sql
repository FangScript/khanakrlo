CREATE TABLE `order_item_modifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderItemId` int NOT NULL,
	`menuModifierId` int,
	`modifierName` varchar(120) NOT NULL,
	`unitPriceMinor` int NOT NULL,
	`quantity` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_item_modifiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`menuItemId` int,
	`dishName` varchar(160) NOT NULL,
	`dishDescription` text,
	`dishImageKey` varchar(500),
	`unitPriceMinor` int NOT NULL,
	`modifierTotalMinor` int NOT NULL DEFAULT 0,
	`lineTotalMinor` int NOT NULL,
	`quantity` int NOT NULL,
	`prepTimeMinutes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`fromStatus` enum('placed','accepted','preparing','ready_for_pickup','assigned','picked_up','delivered','rejected','cancelled'),
	`toStatus` enum('placed','accepted','preparing','ready_for_pickup','assigned','picked_up','delivered','rejected','cancelled') NOT NULL,
	`actorUserId` int,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(40) NOT NULL,
	`customerUserId` int NOT NULL,
	`organisationId` int NOT NULL,
	`outletId` int,
	`kitchenBrandId` int,
	`status` enum('placed','accepted','preparing','ready_for_pickup','assigned','picked_up','delivered','rejected','cancelled') NOT NULL DEFAULT 'placed',
	`paymentMethod` enum('cod') NOT NULL DEFAULT 'cod',
	`paymentStatus` enum('cash_due','paid','void') NOT NULL DEFAULT 'cash_due',
	`deliveryRecipientName` varchar(160) NOT NULL,
	`deliveryPhoneE164` varchar(20) NOT NULL,
	`deliveryAddressLine1` varchar(255) NOT NULL,
	`deliveryAddressLine2` varchar(255),
	`deliveryCity` varchar(120) NOT NULL,
	`deliveryInstructions` varchar(500),
	`itemSubtotalMinor` int NOT NULL,
	`deliveryFeeMinor` int NOT NULL,
	`serviceFeeMinor` int NOT NULL DEFAULT 0,
	`discountMinor` int NOT NULL DEFAULT 0,
	`totalMinor` int NOT NULL,
	`idempotencyKey` varchar(100) NOT NULL,
	`placedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_public_id_unique` UNIQUE(`publicId`),
	CONSTRAINT `orders_customer_idempotency_unique` UNIQUE(`customerUserId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `order_item_modifiers_item_index` ON `order_item_modifiers` (`orderItemId`);--> statement-breakpoint
CREATE INDEX `order_items_order_index` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_status_history_order_index` ON `order_status_history` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_customer_created_index` ON `orders` (`customerUserId`,`placedAt`);--> statement-breakpoint
CREATE INDEX `orders_business_status_index` ON `orders` (`organisationId`,`status`,`placedAt`);