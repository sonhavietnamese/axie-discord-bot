ALTER TABLE `users` ADD `correct_guesses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `longest_streak` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `current_streak` integer DEFAULT 0 NOT NULL;