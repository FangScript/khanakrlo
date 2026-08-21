CREATE TABLE `customer_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`recipientName` varchar(160) NOT NULL,
	`phoneE164` varchar(20) NOT NULL,
	`addressLine1` varchar(255) NOT NULL,
	`addressLine2` varchar(255),
	`city` varchar(120) NOT NULL,
	`instructions` varchar(500),
	`latitudeE6` int NOT NULL,
	`longitudeE6` int NOT NULL,
	`geocodeSource` enum('device','manual') NOT NULL DEFAULT 'device',
	`isDefault` boolean NOT NULL DEFAULT false,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryAddressId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryLatitudeE6` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryLongitudeE6` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryZoneId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryDistanceMeters` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `estimatedCourierMinutes` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `estimatedTotalMinutes` int;--> statement-breakpoint
ALTER TABLE `service_zones` ADD `centerLatitudeE6` int;--> statement-breakpoint
ALTER TABLE `service_zones` ADD `centerLongitudeE6` int;--> statement-breakpoint
ALTER TABLE `service_zones` ADD `radiusMeters` int;--> statement-breakpoint
ALTER TABLE `service_zones` ADD `courierBaseMinutes` int DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `service_zones` ADD `courierMinutesPerKm` int DEFAULT 3 NOT NULL;--> statement-breakpoint
CREATE INDEX `customer_addresses_user_index` ON `customer_addresses` (`userId`,`archivedAt`);--> statement-breakpoint
CREATE INDEX `customer_addresses_coordinates_index` ON `customer_addresses` (`city`,`latitudeE6`,`longitudeE6`);