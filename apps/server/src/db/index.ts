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
			keyword: "GROCERY",
		},
		{
			merchantId: merchants[0].id,
			userId,
			keyword: "FOOD MARKET",
		},
		{
			merchantId: merchants[0].id,
			userId,
			keyword: "SUPERMARKET",
		},
		{
			merchantId: merchants[1].id,
			userId,
			keyword: "COFFEE",
		},
		{
			merchantId: merchants[1].id,
			userId,
			keyword: "CAFE",
		},
		{
			merchantId: merchants[1].id,
			userId,
			keyword: "COFFEE SHOP",
		},
	]);

	// Create transactions for both merchants
	const now = new Date();
	const lastMonth = new Date(
		now.getFullYear(),
		now.getMonth() - 1,
		now.getDate(),
	);

	await db.insert(transaction).values(
		Array.from({ length: 45 }, (_, i) => {
			const isGrocery = i % 2 === 0;
			const merchantId = isGrocery ? merchants[0].id : merchants[1].id;
			const baseAmount = isGrocery ? -8500 : -450;
			const date = i % 2 === 0 ? lastMonth : now;
			const details = isGrocery
				? `Grocery trip ${i + 1}`
				: `Coffee visit ${i + 1}`;

			return {
				userId,
				merchantId,
				amount: baseAmount + i * 100, // Vary amounts slightly
				date,
				transactionDetails: details,
			};
		}),
	);
}
