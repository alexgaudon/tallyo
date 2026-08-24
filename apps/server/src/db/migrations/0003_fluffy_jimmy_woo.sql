ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "split_from_id" text;--> statement-breakpoint
UPDATE "transactions" SET "category_id" = NULL WHERE "category_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "categories"."id" = "transactions"."category_id");--> statement-breakpoint
UPDATE "transactions" SET "merchant_id" = NULL WHERE "merchant_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "merchants" WHERE "merchants"."id" = "transactions"."merchant_id");--> statement-breakpoint
UPDATE "categories" SET "parent_category_id" = NULL WHERE "parent_category_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "categories" AS "p" WHERE "p"."id" = "categories"."parent_category_id");--> statement-breakpoint
UPDATE "merchants" SET "recommended_category_id" = NULL WHERE "recommended_category_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "categories"."id" = "merchants"."recommended_category_id");--> statement-breakpoint
DELETE FROM "merchant_keywords" WHERE NOT EXISTS (SELECT 1 FROM "merchants" WHERE "merchants"."id" = "merchant_keywords"."merchant_id");--> statement-breakpoint
DELETE FROM "auth_token" WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "auth_token"."user_id");--> statement-breakpoint
ALTER TABLE "auth_token" ADD CONSTRAINT "auth_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_recommended_category_id_categories_id_fk" FOREIGN KEY ("recommended_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_keywords" ADD CONSTRAINT "merchant_keywords_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_parent_category_id_idx" ON "categories" USING btree ("parent_category_id");--> statement-breakpoint
CREATE INDEX "transaction_user_id_date_idx" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "transaction_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transaction_merchant_id_idx" ON "transactions" USING btree ("merchant_id");