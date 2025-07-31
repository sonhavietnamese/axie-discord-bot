CREATE TABLE `rod_store` (
	`id` text PRIMARY KEY NOT NULL,
	`rod_id` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`rod_id`) REFERENCES `rods`(`id`) ON UPDATE no action ON DELETE cascade
);
