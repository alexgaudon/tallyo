CREATE TABLE "recurring_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "source_transaction_id" text NOT NULL,
  "merchant_id" text,
  "category_id" text,
  "amount" integer NOT NULL,
  "transaction_details" text NOT NULL,
  "start_date" date NOT NULL,
  "day_of_month" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_transactions_source_transaction_unique" ON "recurring_transactions" USING btree ("source_transaction_id");
