CREATE TABLE `Products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributor_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(128) NOT NULL,
	`weight_kg` decimal(10,3) NOT NULL,
	`quantity_on_hand` int NOT NULL DEFAULT 0,
	`unit_price` decimal(12,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `Products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_distributor_sku_uq` UNIQUE(`distributor_id`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `Stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`change_kind` varchar(16) NOT NULL,
	`delta` int NOT NULL,
	`quantity_after` int NOT NULL,
	`actor_user_id` int,
	`note` varchar(512),
	CONSTRAINT `Stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `Products` ADD CONSTRAINT `Products_distributor_id_Users_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `Users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Stock_movements` ADD CONSTRAINT `Stock_movements_product_id_Products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Stock_movements` ADD CONSTRAINT `Stock_movements_actor_user_id_Users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `Users`(`id`) ON DELETE set null ON UPDATE no action;