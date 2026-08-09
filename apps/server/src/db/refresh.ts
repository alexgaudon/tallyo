import "dotenv/config";
import { addDays, format, startOfMonth } from "date-fns";
import { db } from "./index";
import {
  authToken,
  category,
  merchant,
  merchantKeyword,
  settings,
  transaction,
} from "./schema/app";

type CategorySeed = {
  id?: string;
  name: string;
  icon: string | null;
  treatAsIncome?: boolean;
  hideFromInsights?: boolean;
  parentCategoryId?: string;
};

const categories: CategorySeed[] = [
  {
    id: "income",
    name: "Income",
    icon: "Banknote",
    treatAsIncome: true,
  },
  {
    id: "auto",
    name: "Auto",
    icon: "Car",
  },
  {
    name: "Gas",
    icon: "Fuel",
    parentCategoryId: "auto",
  },
  {
    name: "Insurance",
    icon: "FileText",
    parentCategoryId: "auto",
  },
  {
    name: "Loan",
    icon: "CreditCard",
    parentCategoryId: "auto",
  },
  {
    id: "housing",
    name: "Housing",
    icon: "Home",
  },
  {
    name: "Rent",
    icon: "Home",
    parentCategoryId: "housing",
  },
  {
    id: "utilities",
    name: "Utilities",
    icon: "Settings",
    parentCategoryId: "housing",
  },
  {
    name: "Internet",
    icon: "Wifi",
    parentCategoryId: "utilities",
  },
  {
    id: "food",
    name: "Food",
    icon: "ShoppingCart",
  },
  {
    name: "Groceries",
    icon: "Apple",
    parentCategoryId: "food",
  },
  {
    name: "Restaurants",
    icon: "Pizza",
    parentCategoryId: "food",
  },
  {
    name: "Fast Food",
    icon: "Beer",
    parentCategoryId: "food",
  },
  {
    name: "Treats",
    icon: "Coffee",
    parentCategoryId: "food",
  },
  {
    id: "health_wellness",
    name: "Health & Wellness",
    icon: "Heart",
  },
  {
    name: "Gym Membership",
    icon: "Dumbbell",
    parentCategoryId: "health_wellness",
  },
  {
    id: "spending",
    name: "Spending",
    icon: "Wallet",
  },
  {
    name: "Donations",
    icon: "Gift",
    parentCategoryId: "spending",
  },
  {
    name: "Entertainment",
    icon: "Gamepad2",
    parentCategoryId: "spending",
  },
  {
    name: "Gifts",
    icon: "Gift",
    parentCategoryId: "spending",
  },
  {
    name: "Homelab",
    icon: "Laptop",
    parentCategoryId: "spending",
  },
  {
    name: "Misc",
    icon: "Folder",
    parentCategoryId: "spending",
  },
  {
    name: "Phone Bill",
    icon: "MessageSquare",
    parentCategoryId: "spending",
  },
  {
    name: "Shopping",
    icon: "ShoppingCart",
    parentCategoryId: "spending",
  },
  {
    name: "Subscriptions",
    icon: "Star",
    parentCategoryId: "spending",
  },
  {
    name: "Transfer",
    icon: "Train",
  },
];

type MerchantSeed = {
  name: string;
  recommendedCategoryName: string;
  keywords: string[];
};

const merchants: MerchantSeed[] = [
  {
    name: "Employer",
    recommendedCategoryName: "Income",
    keywords: ["SALARY", "PAYROLL"],
  },
  {
    name: "Landlord",
    recommendedCategoryName: "Rent",
    keywords: ["RENT", "LANDLORD", "APARTMENT"],
  },
  {
    name: "Electric Company",
    recommendedCategoryName: "Utilities",
    keywords: ["ELECTRIC", "UTILITY", "POWER"],
  },
  {
    name: "Comcast",
    recommendedCategoryName: "Internet",
    keywords: ["COMCAST", "INTERNET", "XFINITY"],
  },
  {
    name: "Verizon",
    recommendedCategoryName: "Phone Bill",
    keywords: ["VERIZON", "WIRELESS"],
  },
  {
    name: "Shell",
    recommendedCategoryName: "Gas",
    keywords: ["SHELL", "GAS", "FUEL"],
  },
  {
    name: "Chevron",
    recommendedCategoryName: "Gas",
    keywords: ["CHEVRON", "FUEL"],
  },
  {
    name: "Walmart",
    recommendedCategoryName: "Groceries",
    keywords: ["WALMART", "GROCERY", "SUPERMARKET"],
  },
  { name: "Target", recommendedCategoryName: "Shopping", keywords: ["TARGET"] },
  {
    name: "Trader Joe's",
    recommendedCategoryName: "Groceries",
    keywords: ["TRADER JOE"],
  },
  {
    name: "Costco",
    recommendedCategoryName: "Groceries",
    keywords: ["COSTCO"],
  },
  {
    name: "Whole Foods",
    recommendedCategoryName: "Groceries",
    keywords: ["WHOLE FOODS"],
  },
  { name: "Amazon", recommendedCategoryName: "Shopping", keywords: ["AMAZON"] },
  {
    name: "Best Buy",
    recommendedCategoryName: "Shopping",
    keywords: ["BEST BUY"],
  },
  {
    name: "Home Depot",
    recommendedCategoryName: "Shopping",
    keywords: ["HOME DEPOT", "HARDWARE"],
  },
  {
    name: "Starbucks",
    recommendedCategoryName: "Treats",
    keywords: ["STARBUCKS", "COFFEE"],
  },
  {
    name: "McDonald's",
    recommendedCategoryName: "Fast Food",
    keywords: ["MCDONALD"],
  },
  {
    name: "Chipotle",
    recommendedCategoryName: "Fast Food",
    keywords: ["CHIPOTLE"],
  },
  {
    name: "Restaurant",
    recommendedCategoryName: "Restaurants",
    keywords: ["RESTAURANT", "DINING"],
  },
  {
    name: "Netflix",
    recommendedCategoryName: "Subscriptions",
    keywords: ["NETFLIX"],
  },
  {
    name: "Spotify",
    recommendedCategoryName: "Subscriptions",
    keywords: ["SPOTIFY"],
  },
  {
    name: "Local Gym",
    recommendedCategoryName: "Gym Membership",
    keywords: ["GYM", "FITNESS"],
  },
  {
    name: "Red Cross",
    recommendedCategoryName: "Donations",
    keywords: ["RED CROSS", "DONATION"],
  },
  { name: "Uber", recommendedCategoryName: "Misc", keywords: ["UBER", "RIDE"] },
];

// Deterministic PRNG so refreshes produce stable, believable data.
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type TransactionSeed = {
  amount: number;
  day: number;
  merchantName: string;
  categoryName: string;
  details: string;
  notes?: string;
  reviewed?: boolean;
};

function buildMonthlyTransactions(monthOffset: number): TransactionSeed[] {
  const rand = mulberry32(1000 + monthOffset * 9973);
  const vary = (base: number) => {
    const r = rand();
    return Math.round(base * (1 + (r * 0.18 - 0.09)));
  };

  const income = monthOffset === 0 ? 245830 : vary(245830);

  const transactions: TransactionSeed[] = [
    {
      amount: income,
      day: 1,
      merchantName: "Employer",
      categoryName: "Income",
      details: "Salary",
      reviewed: true,
    },
    {
      amount: income,
      day: 15,
      merchantName: "Employer",
      categoryName: "Income",
      details: "Salary",
      reviewed: true,
    },
    {
      amount: -150000,
      day: 1,
      merchantName: "Landlord",
      categoryName: "Rent",
      details: "Rent Payment",
      reviewed: true,
    },
    {
      amount: -vary(8500),
      day: 3,
      merchantName: "Electric Company",
      categoryName: "Utilities",
      details: "Electricity Bill",
      reviewed: true,
    },
    {
      amount: -7399,
      day: 4,
      merchantName: "Comcast",
      categoryName: "Internet",
      details: "Internet Service",
      reviewed: true,
    },
    {
      amount: -4599,
      day: 5,
      merchantName: "Verizon",
      categoryName: "Phone Bill",
      details: "Wireless Bill",
      reviewed: true,
    },
    {
      amount: -1599,
      day: 6,
      merchantName: "Netflix",
      categoryName: "Subscriptions",
      details: "Streaming Subscription",
      reviewed: true,
    },
    {
      amount: -1199,
      day: 7,
      merchantName: "Spotify",
      categoryName: "Subscriptions",
      details: "Music Subscription",
      reviewed: true,
    },
    {
      amount: -3500,
      day: 8,
      merchantName: "Local Gym",
      categoryName: "Gym Membership",
      details: "Monthly Membership",
      reviewed: true,
    },
    {
      amount: -5000,
      day: 10,
      merchantName: "Red Cross",
      categoryName: "Donations",
      details: "Donation",
      reviewed: true,
    },
    {
      amount: -vary(4500),
      day: 2,
      merchantName: "Shell",
      categoryName: "Gas",
      details: "Gas fill-up",
      reviewed: true,
    },
    {
      amount: -vary(4800),
      day: 17,
      merchantName: "Chevron",
      categoryName: "Gas",
      details: "Gas fill-up",
      reviewed: true,
    },
    {
      amount: -vary(8200),
      day: 11,
      merchantName: "Walmart",
      categoryName: "Groceries",
      details: "Weekly groceries",
      reviewed: true,
    },
    {
      amount: -vary(6400),
      day: 18,
      merchantName: "Trader Joe's",
      categoryName: "Groceries",
      details: "Groceries and snacks",
      reviewed: true,
    },
    {
      amount: -vary(9600),
      day: 25,
      merchantName: "Costco",
      categoryName: "Groceries",
      details: "Bulk groceries",
      reviewed: true,
    },
    {
      amount: -vary(12800),
      day: 12,
      merchantName: "Whole Foods",
      categoryName: "Groceries",
      details: "Weekly groceries run",
      reviewed: true,
    },
    {
      amount: -vary(4899),
      day: 20,
      merchantName: "Amazon",
      categoryName: "Shopping",
      details: "Online order",
      reviewed: true,
    },
    {
      amount: -vary(6899),
      day: 5,
      merchantName: "Target",
      categoryName: "Shopping",
      details: "Household supplies",
      reviewed: false,
    },
    {
      amount: -vary(12499),
      day: 26,
      merchantName: "Best Buy",
      categoryName: "Shopping",
      details: "Electronics",
      reviewed: false,
    },
    {
      amount: -vary(8999),
      day: 23,
      merchantName: "Home Depot",
      categoryName: "Shopping",
      details: "Home improvement",
      reviewed: false,
    },
    {
      amount: -vary(7599),
      day: 14,
      merchantName: "Restaurant",
      categoryName: "Restaurants",
      details: "Dinner out",
      reviewed: true,
    },
    {
      amount: -vary(12499),
      day: 22,
      merchantName: "Restaurant",
      categoryName: "Restaurants",
      details: "Dinner date",
      reviewed: false,
    },
    {
      amount: -vary(2899),
      day: 4,
      merchantName: "Chipotle",
      categoryName: "Fast Food",
      details: "Lunch burrito bowl",
      reviewed: true,
    },
    {
      amount: -vary(1780),
      day: 16,
      merchantName: "McDonald's",
      categoryName: "Fast Food",
      details: "Drive-thru meal",
      reviewed: true,
    },
    {
      amount: -vary(1280),
      day: 3,
      merchantName: "Starbucks",
      categoryName: "Treats",
      details: "Morning coffee",
      reviewed: true,
    },
    {
      amount: -vary(2599),
      day: 24,
      merchantName: "Starbucks",
      categoryName: "Treats",
      details: "Coffee and pastry",
      reviewed: false,
    },
    {
      amount: -vary(1950),
      day: 9,
      merchantName: "Uber",
      categoryName: "Misc",
      details: "Ride to airport",
      reviewed: true,
    },
  ];

  return transactions;
}

async function main() {
  try {
    console.log("Refreshing database...");
    const user = await db.query.user.findFirst({
      columns: { id: true },
    });
    if (!user) {
      throw new Error("No user found. Sign in once before refreshing.");
    }

    await db.transaction(async (tx) => {
      await tx.delete(transaction);
      await tx.delete(merchantKeyword);
      await tx.delete(merchant);
      await tx.delete(category);
      await tx.delete(settings);
      await tx.delete(authToken);
    });
    console.log("Cleared existing data.");

    await db.insert(category).values(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        treatAsIncome: c.treatAsIncome ?? false,
        hideFromInsights: c.hideFromInsights ?? false,
        parentCategoryId: c.parentCategoryId,
        userId: user.id,
      })),
    );
    const categoryRows = await db.query.category.findMany({
      where: (c, { eq }) => eq(c.userId, user.id),
      columns: { id: true, name: true },
    });
    const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));

    await db.insert(merchant).values(
      merchants.map((m) => ({
        name: m.name,
        userId: user.id,
        recommendedCategoryId: categoryIdByName.get(m.recommendedCategoryName),
      })),
    );
    const merchantRows = await db.query.merchant.findMany({
      where: (m, { eq }) => eq(m.userId, user.id),
      columns: { id: true, name: true },
    });
    const merchantIdByName = new Map(merchantRows.map((m) => [m.name, m.id]));

    await db.insert(merchantKeyword).values(
      merchants.flatMap((m) =>
        m.keywords.map((keyword) => ({
          merchantId: merchantIdByName.get(m.name) ?? "",
          userId: user.id,
          keyword,
        })),
      ),
    );

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const transactionRows: {
      userId: string;
      merchantId: string | undefined;
      categoryId: string | undefined;
      amount: number;
      date: string;
      transactionDetails: string;
      notes: string | null;
      reviewed: boolean;
    }[] = [];

    for (let offset = 0; offset < 3; offset++) {
      const monthStart = startOfMonth(
        new Date(now.getFullYear(), now.getMonth() - offset, 1),
      );
      for (const txn of buildMonthlyTransactions(offset)) {
        const date = format(addDays(monthStart, txn.day - 1), "yyyy-MM-dd");
        if (date > today) continue;
        transactionRows.push({
          userId: user.id,
          merchantId: merchantIdByName.get(txn.merchantName),
          categoryId: categoryIdByName.get(txn.categoryName),
          amount: txn.amount,
          date,
          transactionDetails: txn.details,
          notes: txn.notes ?? null,
          reviewed: txn.reviewed ?? false,
        });
      }
    }

    await db.insert(transaction).values(transactionRows);
    console.log(`Seeded ${transactionRows.length} transactions.`);
    console.log("Database refresh completed successfully!");
  } catch (error) {
    console.error("Error refreshing database:", error);
    process.exit(1);
  }
}

main();
