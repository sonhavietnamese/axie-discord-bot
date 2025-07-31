CREATE TABLE `rod_purchase_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`rod_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rod_id`) REFERENCES `rods`(`id`) ON UPDATE no action ON DELETE cascade
);
