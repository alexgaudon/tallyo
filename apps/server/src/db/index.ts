import type { InferInsertModel } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { category, merchant, merchantKeyword, transaction } from "./schema";

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

	// Check if categories already exist
	let categories = await db.query.category.findMany({
		where: (category, { eq }) => eq(category.userId, userId),
	});

	// Create categories if they don't exist
	if (categories.length === 0) {
		categories = await db
			.insert(category)
			.values([
				{
					name: "Income",
					userId,
					icon: "dollar-sign",
					treatAsIncome: true,
				},
				{
					name: "Shopping",
					userId,
					icon: "shopping-bag",
				},
				{
					name: "Groceries",
					userId,
					icon: "shopping-cart",
				},
				{
					name: "Dining Out",
					userId,
					icon: "utensils",
				},
				{
					name: "Rent",
					userId,
					icon: "home",
				},
				{
					name: "Utilities",
					userId,
					icon: "zap",
				},
				{
					name: "Transportation",
					userId,
					icon: "car",
				},
			])
			.returning();

		if (!categories || categories.length !== 7) {
			throw new Error("Failed to create categories");
		}
	}

	// Check if merchants already exist
	let merchants = await db.query.merchant.findMany({
		where: (merchant, { eq }) => eq(merchant.userId, userId),
	});

	// Create merchants if they don't exist
	if (merchants.length === 0) {
		merchants = await db
			.insert(merchant)
			.values([
				{
					name: "Employer",
					userId,
					recommendedCategoryId: categories[0].id, // Income
				},
				{
					name: "Online Store",
					userId,
					recommendedCategoryId: categories[1].id, // Shopping
				},
				{
					name: "Supermarket",
					userId,
					recommendedCategoryId: categories[2].id, // Groceries
				},
				{
					name: "Restaurant",
					userId,
					recommendedCategoryId: categories[3].id, // Dining Out
				},
				{
					name: "Landlord",
					userId,
					recommendedCategoryId: categories[4].id, // Rent
				},
				{
					name: "Electric Company",
					userId,
					recommendedCategoryId: categories[5].id, // Utilities
				},
				{
					name: "Gas Station",
					userId,
					recommendedCategoryId: categories[6].id, // Transportation
				},
			])
			.returning();

		if (!merchants || merchants.length !== 7) {
			throw new Error("Failed to create merchants");
		}
	}

	// Check if keywords already exist
	const existingKeywords = await db.query.merchantKeyword.findMany({
		where: (merchantKeyword, { eq }) => eq(merchantKeyword.userId, userId),
	});

	// Create keywords for merchants if they don't exist
	if (existingKeywords.length === 0) {
		await db.insert(merchantKeyword).values([
			// Employer
			{
				merchantId: merchants[0].id,
				userId,
				keyword: "SALARY",
			},
			{
				merchantId: merchants[0].id,
				userId,
				keyword: "PAYROLL",
			},
			// Online Store
			{
				merchantId: merchants[1].id,
				userId,
				keyword: "AMAZON",
			},
			{
				merchantId: merchants[1].id,
				userId,
				keyword: "EBAY",
			},
			// Supermarket
			{
				merchantId: merchants[2].id,
				userId,
				keyword: "GROCERY",
			},
			{
				merchantId: merchants[2].id,
				userId,
				keyword: "SUPERMARKET",
			},
			// Restaurant
			{
				merchantId: merchants[3].id,
				userId,
				keyword: "RESTAURANT",
			},
			{
				merchantId: merchants[3].id,
				userId,
				keyword: "DINING",
			},
			// Landlord
			{
				merchantId: merchants[4].id,
				userId,
				keyword: "RENT",
			},
			{
				merchantId: merchants[4].id,
				userId,
				keyword: "LANDLORD",
			},
			// Electric Company
			{
				merchantId: merchants[5].id,
				userId,
				keyword: "ELECTRIC",
			},
			{
				merchantId: merchants[5].id,
				userId,
				keyword: "UTILITY",
			},
			// Gas Station
			{
				merchantId: merchants[6].id,
				userId,
				keyword: "GAS",
			},
			{
				merchantId: merchants[6].id,
				userId,
				keyword: "FUEL",
			},
		]);
	}

	// Check if transactions already exist
	const existingTransactions = await db.query.transaction.findMany({
		where: (transaction, { eq }) => eq(transaction.userId, userId),
	});

	// Create transactions for each category if they don't exist
	if (existingTransactions.length === 0) {
		const now = new Date();
		const transactions: InferInsertModel<typeof transaction>[] = [];

		// Define transaction data for each category
		const categoryData = [
			{
				categoryId: categories[0].id, // Income
				merchantId: merchants[0].id,
				amounts: [300000, 320000, 280000, 310000, 290000], // Positive amounts
				details: [
					"Monthly Salary",
					"Bonus Payment",
					"Freelance Project",
					"Overtime Pay",
					"Commission",
				],
			},
			{
				categoryId: categories[1].id, // Shopping
				merchantId: merchants[1].id,
				amounts: [-15000, -8500, -22000, -12000, -18000, -9500, -25000], // Negative amounts
				details: [
					"New Laptop",
					"Clothing Purchase",
					"Home Decor",
					"Electronics",
					"Gift Shopping",
					"Books",
					"Furniture",
				],
			},
			{
				categoryId: categories[2].id, // Groceries
				merchantId: merchants[2].id,
				amounts: [-4500, -6200, -3800, -7100, -5400, -8900, -3200, -6800], // Negative amounts
				details: [
					"Weekly Groceries",
					"Fruit and Vegetables",
					"Dairy Products",
					"Meat and Poultry",
					"Bakery Items",
					"Household Essentials",
					"Snacks",
					"Beverages",
				],
			},
			{
				categoryId: categories[3].id, // Dining Out
				merchantId: merchants[3].id,
				amounts: [-2500, -1800, -3200, -1500, -2800, -2200], // Negative amounts
				details: [
					"Italian Restaurant",
					"Coffee and Pastry",
					"Sushi Dinner",
					"Fast Food",
					"Brunch",
					"Takeout Pizza",
				],
			},
			{
				categoryId: categories[4].id, // Rent
				merchantId: merchants[4].id,
				amounts: [-150000, -150000, -150000], // Negative amounts
				details: ["Monthly Rent", "Rent Payment", "Apartment Rent"],
			},
			{
				categoryId: categories[5].id, // Utilities
				merchantId: merchants[5].id,
				amounts: [-8500, -6200, -9500, -7800, -10200], // Negative amounts
				details: [
					"Electricity Bill",
					"Water Bill",
					"Internet Bill",
					"Gas Bill",
					"Phone Bill",
				],
			},
			{
				categoryId: categories[6].id, // Transportation
				merchantId: merchants[6].id,
				amounts: [-4500, -3200, -6800, -2800, -5200, -3900, -7100], // Negative amounts
				details: [
					"Gas Fill-up",
					"Car Maintenance",
					"Public Transit",
					"Taxi Ride",
					"Parking Fee",
					"Car Insurance",
					"Uber Ride",
				],
			},
		];

		categoryData.forEach((catData, catIndex) => {
			catData.details.forEach((detail, i) => {
				const date = new Date(
					now.getFullYear(),
					now.getMonth() - Math.floor(Math.random() * 3), // Last 3 months
					Math.floor(Math.random() * 28) + 1, // Random day
				);
				transactions.push({
					userId,
					merchantId: catData.merchantId,
					categoryId: catData.categoryId,
					amount: catData.amounts[i] || catData.amounts[0], // Fallback if more details than amounts
					date: date.toISOString().split("T")[0],
					transactionDetails: detail,
					reviewed: true,
				});
			});
		});

		await db.insert(transaction).values(transactions);
	}
}
