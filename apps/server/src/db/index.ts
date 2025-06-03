import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { merchant, merchantKeyword, transaction } from "./schema";

export const db = drizzle(process.env.DATABASE_URL || "", { schema });

export async function healthCheck() {
	await db.execute("SELECT 1");
}

export async function seed() {
	// Get the first user from the database
	const existingUser = await db.query.user.findFirst();

	if (!existingUser) {
		throw new Error(
			"No user found in the database. Please create a user first.",
		);
	}

	const userId = existingUser.id;

	// Create two merchants
	const merchants = await db
		.insert(merchant)
		.values([
			{
				name: "Grocery Store",
				userId,
			},
			{
				name: "Coffee Shop",
				userId,
			},
		])
		.returning();

	if (!merchants || merchants.length !== 2) {
		throw new Error("Failed to create merchants");
	}

	// Create keywords for merchants
	await db.insert(merchantKeyword).values([
		{
			merchantId: merchants[0].id,
			userId,
			keywords: "GROCERY,FOOD MARKET,SUPERMARKET",
		},
		{
			merchantId: merchants[1].id,
			userId,
			keywords: "COFFEE,CAFE,COFFEE SHOP",
		},
	]);

	// Create transactions for both merchants
	const now = new Date();
	const lastMonth = new Date(
		now.getFullYear(),
		now.getMonth() - 1,
		now.getDate(),
	);

	await db.insert(transaction).values([
		// Grocery Store transactions
		{
			userId,
			merchantId: merchants[0].id,
			amount: -8500, // $85.00
			date: lastMonth,
			transactionDetails: "Weekly groceries",
		},
		{
			userId,
			merchantId: merchants[0].id,
			amount: -9200, // $92.00
			date: now,
			transactionDetails: "Monthly groceries",
		},
		// Coffee Shop transactions
		{
			userId,
			merchantId: merchants[1].id,
			amount: -450, // $4.50
			date: lastMonth,
			transactionDetails: "Morning coffee",
		},
		{
			userId,
			merchantId: merchants[1].id,
			amount: -550, // $5.50
			date: now,
			transactionDetails: "Coffee and pastry",
		},
	]);
}
