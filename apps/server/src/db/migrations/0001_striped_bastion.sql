ALTER TABLE "transactions" ALTER COLUMN "date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "split_group_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "split_index" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "split_total" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "original_amount" integer;