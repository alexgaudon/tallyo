import { relations } from "drizzle-orm";
import {
	boolean,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
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
	(table) => [uniqueIndex("name_user_id_unique").on(table.name, table.userId)],
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
