DROP TABLE "verification" CASCADE;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "webhook_urls" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "split_group_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "split_index";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "split_total";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "original_amount";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "refresh_token";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "id_token";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "access_token_expires_at";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "refresh_token_expires_at";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "user_agent";