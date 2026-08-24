ALTER TABLE "auth_token" ADD COLUMN "token_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_token_token_hash_unique" ON "auth_token" USING btree ("token_hash");