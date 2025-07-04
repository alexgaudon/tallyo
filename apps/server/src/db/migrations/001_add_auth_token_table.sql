-- Migration: Add auth_token table
-- Created: 2024-01-XX

CREATE TABLE IF NOT EXISTS "auth_token" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL,
    "token" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "auth_token_user_id_unique" ON "auth_token" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_token_token_unique" ON "auth_token" ("token");

-- Add foreign key constraint
ALTER TABLE "auth_token" ADD CONSTRAINT "auth_token_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; 