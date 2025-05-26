import { index, int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { InferInsertModel, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { user } from "./auth-schema";

export * from "./auth-schema";

// APPLICATION SPECIFIC

export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  privacyMode: int("privacy_mode", {
    mode: "boolean",
  }).default(sql`false`),
  developerMode: int("developer_mode", {
    mode: "boolean",
  }).default(sql`false`),
});

export const authToken = sqliteTable(
  "auth_token",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    token: text("token").notNull(),
  },
  (table) => [unique().on(table.token)],
);

export const category = sqliteTable(
  "category",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    name: text("name").notNull(),
    userId: text("user_id")
      .references(() => user.id)
      .notNull(),
    color: text("color").notNull(),
    treatAsIncome: int("treat_as_income", {
      mode: "boolean",
    }).default(sql`false`),
    hideFromInsights: int("hidden_in_insights", {
      mode: "boolean",
    }).default(sql`false`),
    createdAt: int("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`current_timestamp`),
    updatedAt: int("updated_at", { mode: "timestamp_ms" })
      .default(sql`current_timestamp`)
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique().on(table.name, table.userId),
    index("idx_category_hidden").on(
      table.id,
      table.hideFromInsights,
      table.name,
      table.treatAsIncome,
    ),
  ],
);

export type NewTransaction = InferInsertModel<typeof transaction>;

export const transaction = sqliteTable(
  "transaction",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    vendor: text("vendor").notNull(),
    displayVendor: text("display_vendor"),
    amount: int("amount").notNull(),
    description: text("description"),
    date: text("date"),
    userId: text("user_id")
      .references(() => user.id, {
        onDelete: "cascade",
      })
      .notNull(),
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "cascade",
    }),
    reviewed: int("reviewed", {
      mode: "boolean",
    })
      .notNull()
      .default(sql`false`),
    externalId: text("external_id"),
    createdAt: int("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`current_timestamp`),
    updatedAt: int("updated_at", { mode: "timestamp_ms" })
      .default(sql`current_timestamp`)
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique().on(table.externalId, table.userId),
    index("idx_transaction_user_category_date").on(
      table.userId,
      table.categoryId,
      table.date,
    ),
    index("idx_transaction_category_date").on(
      table.userId,
      table.categoryId,
      table.date,
    ),
  ],
);
