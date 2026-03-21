CREATE TABLE `Cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cart_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Cart_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_items_cart_product_uq` UNIQUE(`cart_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `Carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`retailer_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_retailer_uq` UNIQUE(`retailer_id`)
);
--> statement-breakpoint
CREATE TABLE `Retailer_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` decimal(12,2) NOT NULL,
	`line_total` decimal(14,2) NOT NULL,
	CONSTRAINT `Retailer_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Retailer_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`retailer_id` int NOT NULL,
	`distributor_id` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'placed',
	`total_amount` decimal(14,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `Retailer_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `Products` ADD `category` varchar(128);--> statement-breakpoint
ALTER TABLE `Cart_items` ADD CONSTRAINT `Cart_items_cart_id_Carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `Carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Cart_items` ADD CONSTRAINT `Cart_items_product_id_Products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Carts` ADD CONSTRAINT `Carts_retailer_id_Users_id_fk` FOREIGN KEY (`retailer_id`) REFERENCES `Users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Retailer_order_items` ADD CONSTRAINT `Retailer_order_items_order_id_Retailer_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `Retailer_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Retailer_order_items` ADD CONSTRAINT `Retailer_order_items_product_id_Products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Retailer_orders` ADD CONSTRAINT `Retailer_orders_retailer_id_Users_id_fk` FOREIGN KEY (`retailer_id`) REFERENCES `Users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Retailer_orders` ADD CONSTRAINT `Retailer_orders_distributor_id_Users_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `Users`(`id`) ON DELETE restrict ON UPDATE no action;