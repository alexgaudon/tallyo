import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const settings = pgTable("settings", {
	id: text("id")
		.primaryKey()
		.$defaultFn((): string => Bun.randomUUIDv7()),
	userId: text("user_id").notNull().unique(),
	isDevMode: boolean("is_dev_mode").notNull().default(false),
	isPrivacyMode: boolean("is_privacy_mode").notNull().default(false),
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
			.$defaultFn((): string => Bun.randomUUIDv7()),
		name: text("name").notNull(),
		userId: text("user_id").notNull(),
		parentCategoryId: text("parent_category_id"),
		icon: text("icon"),
		treatAsIncome: boolean("treat_as_income").notNull().default(false),
		hideFromInsights: boolean("hide_from_insights").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("category_name_user_id_unique").on(table.name, table.userId),
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
			.$defaultFn((): string => Bun.randomUUIDv7()),
		name: text("name").notNull(),
		userId: text("user_id").notNull(),
		recommendedCategoryId: text("recommended_category_id"),
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
			.$defaultFn((): string => Bun.randomUUIDv7()),
		merchantId: text("merchant_id").notNull(),
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
			.$defaultFn((): string => Bun.randomUUIDv7()),
		userId: text("user_id").notNull(),
		merchantId: text("merchant_id"),
		categoryId: text("category_id"),
		amount: integer("amount").notNull(),
		date: timestamp("date").notNull(),
		transactionDetails: text("transaction_details").notNull(),
		notes: text("notes"),
		externalId: text("external_id"),
		reviewed: boolean("reviewed").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("transaction_external_id_user_id_unique").on(
			table.externalId,
			table.userId,
		),
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
}));
