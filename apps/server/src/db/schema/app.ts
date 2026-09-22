import crypto from "node:crypto";
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const settings = pgTable("settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn((): string => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name"),
  isDevMode: boolean("is_dev_mode").notNull().default(false),
  isPrivacyMode: boolean("is_privacy_mode").notNull().default(false),
  webhookUrls: text("webhook_urls").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(user, {
    fields: [settings.userId],
    references: [user.id],
  }),
}));

export const category = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn((): string => crypto.randomUUID()),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
    parentCategoryId: text("parent_category_id").references(
      (): AnyPgColumn => category.id,
      { onDelete: "cascade" },
    ),
    icon: text("icon"),
    treatAsIncome: boolean("treat_as_income").notNull().default(false),
    hideFromInsights: boolean("hide_from_insights").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("category_name_user_id_unique").on(table.name, table.userId),
    index("category_parent_category_id_idx").on(table.parentCategoryId),
  ],
);

export const categoryRelations = relations(category, ({ many, one }) => ({
  subCategories: many(category, {
    relationName: "subCategories",
  }),
  parentCategory: one(category, {
    fields: [category.parentCategoryId],
    references: [category.id],
    relationName: "subCategories",
  }),
  user: one(user, {
    fields: [category.userId],
    references: [user.id],
  }),
}));

export const merchant = pgTable(
  "merchants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn((): string => crypto.randomUUID()),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
    recommendedCategoryId: text("recommended_category_id").references(
      () => category.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("merchant_name_user_id_unique").on(table.name, table.userId),
  ],
);

export const merchantKeyword = pgTable(
  "merchant_keywords",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn((): string => crypto.randomUUID()),
    merchantId: text("merchant_id")
      .notNull()
      .references(() => merchant.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    keyword: text("keyword").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("merchant_keyword_unique").on(
      table.merchantId,
      table.keyword,
      table.userId,
    ),
  ],
);

export const merchantRelations = relations(merchant, ({ one, many }) => ({
  user: one(user, {
    fields: [merchant.userId],
    references: [user.id],
  }),
  recommendedCategory: one(category, {
    fields: [merchant.recommendedCategoryId],
    references: [category.id],
  }),
  keywords: many(merchantKeyword),
}));

export const merchantKeywordRelations = relations(
  merchantKeyword,
  ({ one }) => ({
    merchant: one(merchant, {
      fields: [merchantKeyword.merchantId],
      references: [merchant.id],
    }),
    user: one(user, {
      fields: [merchantKeyword.userId],
      references: [user.id],
    }),
  }),
);

export const transaction = pgTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn((): string => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    merchantId: text("merchant_id").references(() => merchant.id, {
      onDelete: "set null",
    }),
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    amount: integer("amount").notNull(),
    date: date("date").notNull(),
    transactionDetails: text("transaction_details").notNull(),
    notes: text("notes"),
    externalId: text("external_id"),
    // AI (Jev) category suggestion. Advisory metadata only — never auto-applied;
    // the UI offers it and the user accepts. Populated asynchronously by the
    // suggestion worker.
    suggestedCategoryId: text("suggested_category_id").references(
      () => category.id,
      { onDelete: "set null" },
    ),
    suggestedCategoryConfidence: real("suggested_category_confidence"),
    reviewed: boolean("reviewed").notNull().default(false),
    excludedFromInsights: boolean("excluded_from_insights")
      .notNull()
      .default(false),
    // Explicit override for which side of the ledger a transaction is on.
    // Null means "infer from the category's treatAsIncome flag" (legacy
    // behaviour); "transfer" is excluded from insights scope entirely.
    flow: text("flow", { enum: ["income", "expense", "transfer"] }),
    // Groups the children of a split. Not a row reference: the original
    // transaction is deleted when it is split, so this is a logical group id
    // shared by every child rather than a foreign key.
    splitGroupId: text("split_group_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("transaction_external_id_user_id_unique").on(
      table.externalId,
      table.userId,
    ),
    index("transaction_user_id_date_idx").on(table.userId, table.date),
    index("transaction_category_id_idx").on(table.categoryId),
    index("transaction_merchant_id_idx").on(table.merchantId),
    index("transaction_split_group_id_idx").on(table.splitGroupId),
  ],
);

export const transactionRelations = relations(transaction, ({ one }) => ({
  user: one(user, {
    fields: [transaction.userId],
    references: [user.id],
  }),
  merchant: one(merchant, {
    fields: [transaction.merchantId],
    references: [merchant.id],
  }),
  category: one(category, {
    fields: [transaction.categoryId],
    references: [category.id],
  }),
  suggestedCategory: one(category, {
    fields: [transaction.suggestedCategoryId],
    references: [category.id],
  }),
}));

/**
 * Durable queue for asynchronous AI category suggestions. One job per
 * transaction; claimed with `FOR UPDATE SKIP LOCKED` by the in-process worker.
 */
export const suggestionJob = pgTable(
  "suggestion_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn((): string => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "processing", "done", "failed"],
    })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    // Earliest time the job may run; used for retry backoff.
    runAt: timestamp("run_at").notNull().defaultNow(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("suggestion_job_transaction_id_unique").on(table.transactionId),
    index("suggestion_job_status_run_at_idx").on(table.status, table.runAt),
  ],
);

export const authToken = pgTable(
  "auth_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn((): string => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    // SHA-256 of the raw token; enables indexed lookup at validation time.
    // Nullable so pre-existing bcrypt-only tokens remain valid until regenerated.
    tokenHash: text("token_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_token_user_id_unique").on(table.userId),
    uniqueIndex("auth_token_token_unique").on(table.token),
    uniqueIndex("auth_token_token_hash_unique").on(table.tokenHash),
  ],
);

export const authTokenRelations = relations(authToken, ({ one }) => ({
  user: one(user, {
    fields: [authToken.userId],
    references: [user.id],
  }),
}));
