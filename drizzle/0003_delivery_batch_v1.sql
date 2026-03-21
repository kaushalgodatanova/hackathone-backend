CREATE TABLE `Batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opens_at` timestamp NOT NULL,
	`closes_at` timestamp NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`outcome` varchar(16),
	`closed_at` timestamp,
	CONSTRAINT `Batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Delivery_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_id` int NOT NULL,
	`partner_id` int NOT NULL,
	`total_km` decimal(12,3) NOT NULL,
	`utilization_pct` decimal(8,2) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'planned',
	`ai_choice_id` varchar(8),
	`ai_reason` text,
	`candidate_plans_json` text NOT NULL,
	`chosen_plan_json` text NOT NULL,
	CONSTRAINT `Delivery_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_runs_batch_uq` UNIQUE(`batch_id`)
);
--> statement-breakpoint
CREATE TABLE `Delivery_sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(255) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`city` varchar(128),
	`area` varchar(128),
	`is_retail_drop` boolean NOT NULL DEFAULT true,
	CONSTRAINT `Delivery_sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Run_stops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` int NOT NULL,
	`sequence` int NOT NULL,
	`kind` varchar(16) NOT NULL,
	`site_id` int NOT NULL,
	`distributor_id` int,
	`retailer_id` int,
	`load_kg` decimal(12,3) NOT NULL DEFAULT '0',
	CONSTRAINT `Run_stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `Retailer_orders` ADD `batch_id` int;--> statement-breakpoint
ALTER TABLE `Retailer_orders` ADD `delivery_site_id` int;--> statement-breakpoint
ALTER TABLE `Users` ADD `default_delivery_site_id` int;--> statement-breakpoint
ALTER TABLE `Users` ADD `depot_site_id` int;--> statement-breakpoint
ALTER TABLE `Users` ADD `partner_capacity_kg` decimal(10,3);--> statement-breakpoint
ALTER TABLE `Users` ADD `vehicle_label` varchar(128);--> statement-breakpoint
ALTER TABLE `Delivery_runs` ADD CONSTRAINT `Delivery_runs_batch_id_Batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `Batches`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Delivery_runs` ADD CONSTRAINT `Delivery_runs_partner_id_Users_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `Users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Run_stops` ADD CONSTRAINT `Run_stops_run_id_Delivery_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `Delivery_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Run_stops` ADD CONSTRAINT `Run_stops_site_id_Delivery_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `Delivery_sites`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Run_stops` ADD CONSTRAINT `Run_stops_distributor_id_Users_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `Users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Run_stops` ADD CONSTRAINT `Run_stops_retailer_id_Users_id_fk` FOREIGN KEY (`retailer_id`) REFERENCES `Users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Retailer_orders` ADD CONSTRAINT `Retailer_orders_batch_id_Batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `Batches`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Retailer_orders` ADD CONSTRAINT `Retailer_orders_delivery_site_id_Delivery_sites_id_fk` FOREIGN KEY (`delivery_site_id`) REFERENCES `Delivery_sites`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Users` ADD CONSTRAINT `Users_default_delivery_site_id_Delivery_sites_id_fk` FOREIGN KEY (`default_delivery_site_id`) REFERENCES `Delivery_sites`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Users` ADD CONSTRAINT `Users_depot_site_id_Delivery_sites_id_fk` FOREIGN KEY (`depot_site_id`) REFERENCES `Delivery_sites`(`id`) ON DELETE set null ON UPDATE no action;