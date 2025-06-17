CREATE TABLE `hanana_participants` (
	`hanana_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hanana_id`) REFERENCES `hanana`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `hanana` DROP COLUMN `participants`;