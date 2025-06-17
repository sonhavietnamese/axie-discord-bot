CREATE TABLE `fish` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rarity` text NOT NULL,
	`image` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fish_name_unique` ON `fish` (`name`);--> statement-breakpoint
CREATE TABLE `fish_catches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`fish_id` text NOT NULL,
	`caught_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fish_id`) REFERENCES `fish`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fish_catches_user_id_idx` ON `fish_catches` (`user_id`);--> statement-breakpoint
CREATE INDEX `fish_catches_fish_id_idx` ON `fish_catches` (`fish_id`);--> statement-breakpoint
CREATE TABLE `underwaters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rarity` text NOT NULL,
	`image` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `underwaters_name_unique` ON `underwaters` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`fish` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
