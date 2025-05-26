import { drizzle } from "drizzle-orm/libsql";
import { uuidv7 } from "uuidv7";
import { auth } from "../auth";
import { category, transaction, userSettings } from "./schema";
const categories = [
  "Groceries",
  "Transportation",
  "Housing",
  "Utilities",
  "Entertainment",
  "Technology",
  "Dining Out",
  "Shopping",
];

const vendors = [
  "Landlord - Transfer",
  "Walmart",
  "Amazon",
  "Target",
  "Best Buy",
  "McDonalds",
  "Tim Hortons",
  "Subway",
  "KFC",
  "Pizza Hut",
  "Burger King",
  "Starbucks",
  "Apple",
  "Google",
  "Microsoft",
  "Sobeys",
  "Wendys",
  "Telus",
];

// Map vendors to their most likely categories
const vendorCategories: Record<string, string[]> = {
  Telus: ["Utilities"],
  "Landlord - Transfer": ["Housing"],
  Walmart: ["Groceries", "Shopping"],
  Amazon: ["Shopping", "Technology"],
  Target: ["Shopping", "Groceries"],
  "Best Buy": ["Technology", "Shopping"],
  Apple: ["Technology"],
  Google: ["Technology"],
  Microsoft: ["Technology"],
  Sobeys: ["Groceries"],
  Wendys: ["Dining Out"],
  McDonalds: ["Dining Out"],
  "Tim Hortons": ["Dining Out"],
  Subway: ["Dining Out"],
  KFC: ["Dining Out"],
  "Pizza Hut": ["Dining Out"],
  "Burger King": ["Dining Out"],
  Starbucks: ["Dining Out"],
};

function getCategoryName() {
  return categories.pop();
}

async function main() {
  const db = drizzle(process.env.DATABASE_URL as string);

  const { token, user } = await auth.api.signUpEmail({
    body: {
      email: "test@test.com",
      password: "password",
      name: "Test User",
    },
  });

  await db.insert(userSettings).values({
    id: uuidv7(),
    userId: user.id,
    privacyMode: false,
    developerMode: true,
  });

  const categoriesToMake = [
    {
      id: uuidv7(),
      name: "Income",
      userId: user.id,
      color: "#00ff00",
      treatAsIncome: true,
    },
    {
      id: uuidv7(),
      name: "Transfer",
      userId: user.id,
      color: "#ff0000",
      hideFromInsights: true,
    },
    ...categories.map((name) => ({
      id: uuidv7(),
      name,
      userId: user.id,
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
    })),
  ];

  await db.insert(category).values(categoriesToMake);

  const transactionsToCreate = [];

  // Generate dates for 3 months of income (3 per month)
  const incomeDates = [];
  const today = new Date();
  for (let month = 0; month < 3; month++) {
    const monthDate = new Date(today);
    monthDate.setMonth(today.getMonth() - month);

    // Generate 3 random days in the month for income
    for (let i = 0; i < 3; i++) {
      const day = Math.floor(Math.random() * 28) + 1; // Use 28 to avoid month overflow
      const incomeDate = new Date(monthDate);
      incomeDate.setDate(day);
      incomeDates.push(incomeDate);
    }
  }

  // Generate all transactions
  for (let i = 0; i < 500; i++) {
    const transactionDate = new Date(today);
    transactionDate.setMonth(today.getMonth() - Math.floor(i / 167)); // Spread over 3 months
    transactionDate.setDate(Math.floor(Math.random() * 28) + 1);

    const isIncome = incomeDates.some(
      (date) =>
        date.getDate() === transactionDate.getDate() &&
        date.getMonth() === transactionDate.getMonth() &&
        date.getFullYear() === transactionDate.getFullYear(),
    );

    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const possibleCategories = vendorCategories[vendor];
    const category = isIncome
      ? categoriesToMake.find((c) => c.name === "Income")!
      : categoriesToMake.find((c) => possibleCategories.includes(c.name))!;

    transactionsToCreate.push({
      id: uuidv7(),
      userId: user.id,
      vendor,
      displayVendor: vendor,
      amount: isIncome
        ? Math.floor((Math.random() * 550 + 1250) * 10) // Random amount between 12500 and 18000 cents
        : -Math.floor((Math.random() * 100 + 10) * 10), // Random amount between -1100 and -100 cents
      date: transactionDate,
      description: "",
      categoryId: category.id,
      reviewed: true,
    });
  }

  await db.insert(transaction).values(
    transactionsToCreate.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    })),
  );
}

main().then(() => {
  console.log("Seeded database");
});
