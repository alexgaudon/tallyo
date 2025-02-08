ALTER TABLE `transaction` RENAME COLUMN "vendor" TO "vendor_raw";--> statement-breakpoint
DROP INDEX `auth_token_id_unique`;