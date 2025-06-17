CREATE TABLE `fishes` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hanana` (
	`id` text PRIMARY KEY NOT NULL,
	`by` text NOT NULL,
	`participants` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`ended_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `inventories` (
	`id` text PRIMARY KEY NOT NULL,
	`fishes` integer DEFAULT 0 NOT NULL,
	`trash` integer DEFAULT 0 NOT NULL,
	`nfts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`fishes`) REFERENCES `fishes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trash`) REFERENCES `trashes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nfts`) REFERENCES `nfts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `nfts` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rods` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trashes` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rates` text NOT NULL,
	`inventories` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`inventories`) REFERENCES `inventories`(`id`) ON UPDATE no action ON DELETE no action
);
