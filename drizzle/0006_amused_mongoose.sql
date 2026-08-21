ALTER TABLE `menu_categories` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `menu_categories` ADD `archivedByUserId` int;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `archivedByUserId` int;--> statement-breakpoint
ALTER TABLE `menu_modifiers` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `menu_modifiers` ADD `archivedByUserId` int;