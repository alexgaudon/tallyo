DROP INDEX "auth_token_token_unique";--> statement-breakpoint
DROP INDEX "idx_category_hidden";--> statement-breakpoint
DROP INDEX "category_name_user_id_unique";--> statement-breakpoint
DROP INDEX "idx_transaction_user_category_date";--> statement-breakpoint
DROP INDEX "idx_transaction_category_date";--> statement-breakpoint
DROP INDEX "transaction_external_id_user_id_unique";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `transaction` ALTER COLUMN "vendor" TO "vendor" text;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_token_token_unique` ON `auth_token` (`token`);--> statement-breakpoint
CREATE INDEX `idx_category_hidden` ON `category` (`id`,`hidden_in_insights`,`name`,`treat_as_income`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_user_id_unique` ON `category` (`name`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_user_category_date` ON `transaction` (`user_id`,`category_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_transaction_category_date` ON `transaction` (`user_id`,`category_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_external_id_user_id_unique` ON `transaction` (`external_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);