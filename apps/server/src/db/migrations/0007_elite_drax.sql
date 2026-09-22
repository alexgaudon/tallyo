-- Idempotent on purpose: the Jev branch's `suggested_category_id` /
-- `suggested_category_confidence` columns and their FK may already exist in a
-- database that was synced with `drizzle-kit push` from that branch, so this
-- migration must be safe to apply on top of either state.
CREATE TABLE IF NOT EXISTS "suggestion_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "suggested_category_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "suggested_category_confidence" real;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "suggestion_jobs" ADD CONSTRAINT "suggestion_jobs_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "suggestion_job_transaction_id_unique" ON "suggestion_jobs" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggestion_job_status_run_at_idx" ON "suggestion_jobs" USING btree ("status","run_at");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "transactions" ADD CONSTRAINT "transactions_suggested_category_id_categories_id_fk" FOREIGN KEY ("suggested_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
