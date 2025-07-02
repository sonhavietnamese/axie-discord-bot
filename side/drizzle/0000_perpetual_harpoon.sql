CREATE TABLE `axies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_revealed` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
