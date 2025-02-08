CREATE UNIQUE INDEX `auth_token_id_unique` ON `auth_token` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_token_token_unique` ON `auth_token` (`token`);