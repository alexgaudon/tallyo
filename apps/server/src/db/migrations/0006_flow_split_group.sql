ALTER TABLE "transactions" ADD COLUMN "excluded_from_insights" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "flow" text;--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "split_from_id" TO "split_group_id";--> statement-breakpoint
CREATE INDEX "transaction_split_group_id_idx" ON "transactions" USING btree ("split_group_id");
