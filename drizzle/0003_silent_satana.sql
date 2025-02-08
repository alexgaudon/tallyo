DROP INDEX `idx_transaction_user_category_date`;--> statement-breakpoint
CREATE INDEX `idx_transaction_category_date` ON `transaction` (`user_id`,`category_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_transaction_user_category_date` ON `transaction` (`user_id`,`category_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_category_hidden` ON `category` (`id`,`hidden_in_insights`,`name`,`treat_as_income`);