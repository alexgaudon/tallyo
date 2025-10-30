import { addDays, startOfMonth } from "date-fns";
import { db } from "./index";
import { category, merchant, transaction } from "./schema/app";

const categories = [
  {
    id: "auto",
    name: "Auto",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: null,
  },
  {
    name: "Gas",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "auto",
  },
  {
    name: "Insurance",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "auto",
  },
  {
    name: "Loan",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "auto",
  },
  {
    id: "housing",
    name: "Housing",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: null,
  },
  {
    id: "rent",
    name: "Rent",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "housing",
  },
  {
    id: "utilities",
    name: "Utilities",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "housing",
  },
  {
    id: "internet",
    name: "Internet",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "utilities",
  },
  {
    id: "food",
    name: "Food",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: null,
  },
  {
    name: "Fast Food",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "food",
  },
  {
    name: "Restaurants",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "food",
  },
  {
    name: "Groceries",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "food",
  },
  {
    name: "Treats",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "food",
  },
  {
    id: "health_wellness",
    name: "Health & Wellness",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: null,
  },
  {
    name: "Gym Membership",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "health_wellness",
  },
  {
    name: "Income",
    icon: null,
    treatAsIncome: true,
    hideFromInsights: false,
    parentCategoryId: null,
  },
  {
    name: "Investments",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: null,
  },
  {
    id: "spending",
    name: "Spending",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: null,
  },
  {
    name: "Donations",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Entertainment",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Gifts",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Homelab",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Misc",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Phone Bill",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Shopping",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Subscriptions",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: "spending",
  },
  {
    name: "Transfer",
    icon: null,
    treatAsIncome: false,
    hideFromInsights: false,
    parentCategoryId: null,
  },
];

const merchants = [
  {
    name: "Electric Company",
    recommendedCategoryName: "Utilities",
  },
  {
    name: "Employer",
    recommendedCategoryName: "Income",
  },
  {
    name: "Amazon",
    recommendedCategoryName: "Shopping",
  },
  {
    name: "Walmart",
    recommendedCategoryName: "Groceries",
  },
  {
    name: "Target",
    recommendedCategoryName: "Shopping",
  },
  {
    name: "Restaurant",
    recommendedCategoryName: "Restaurants",
  },
  {
    name: "Landlord",
    recommendedCategoryName: "Rent",
  },
  {
    name: "Shell",
    recommendedCategoryName: "Gas",
  },
  {
    name: "Trader Joe's",
    recommendedCategoryName: "Groceries",
  },
  {
    name: "Costco",
    recommendedCategoryName: "Groceries",
  },
  {
    name: "Whole Foods",
    recommendedCategoryName: "Groceries",
  },
  {
    name: "Starbucks",
    recommendedCategoryName: "Treats",
  },
  {
    name: "McDonald's",
    recommendedCategoryName: "Fast Food",
  },
  {
    name: "Chipotle",
    recommendedCategoryName: "Fast Food",
  },
  {
    name: "Best Buy",
    recommendedCategoryName: "Shopping",
  },
  {
    name: "Home Depot",
    recommendedCategoryName: "Shopping",
  },
  {
    name: "Comcast",
    recommendedCategoryName: "Internet",
  },
  {
    name: "Verizon",
    recommendedCategoryName: "Phone Bill",
  },
  {
    name: "Netflix",
    recommendedCategoryName: "Subscriptions",
  },
  {
    name: "Spotify",
    recommendedCategoryName: "Subscriptions",
  },
  {
    name: "Local Gym",
    recommendedCategoryName: "Gym Membership",
  },
  {
    name: "Red Cross",
    recommendedCategoryName: "Donations",
  },
];

function getMonthStart(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return startOfMonth(d);
}

function addTenPercentVariance(amount: number): number {
  const variance = Math.random() * 0.2 - 0.1; // -10% .. +10%
  return Math.round(amount * (1 + variance));
}

const buildMonthlyTransactions = (baseDate: Date, monthOffset: number) => [
  {
    amount: monthOffset === 0 ? 245830 : addTenPercentVariance(245830),
    date: baseDate,
    transactionDetails: "Salary",
    merchantName: "Employer",
    categoryName: "Income",
  },
  {
    amount: monthOffset === 0 ? 245830 : addTenPercentVariance(245830),
    date: addDays(baseDate, 14),
    transactionDetails: "Salary",
    merchantName: "Employer",
    categoryName: "Income",
  },
  {
    amount: monthOffset === 0 ? -150000 : addTenPercentVariance(-150000),
    date: baseDate,
    transactionDetails: "Rent Payment",
    merchantName: "Landlord",
    categoryName: "Rent",
  },
  {
    amount: monthOffset === 0 ? -8500 : addTenPercentVariance(-8500),
    date: baseDate,
    transactionDetails: "Electricity Bill",
    merchantName: "Electric Company",
    categoryName: "Utilities",
  },
  {
    amount: monthOffset === 0 ? -15320 : addTenPercentVariance(-15320),
    date: addDays(baseDate, 11),
    transactionDetails: "Groceries for the month",
    merchantName: "Walmart",
    categoryName: "Groceries",
  },
  {
    amount: monthOffset === 0 ? -4200 : addTenPercentVariance(-4200),
    date: addDays(baseDate, 2),
    transactionDetails: "Gas fill-up",
    merchantName: "Shell",
    categoryName: "Gas",
  },
  {
    amount: monthOffset === 0 ? -1280 : addTenPercentVariance(-1280),
    date: addDays(baseDate, 3),
    transactionDetails: "Morning coffee",
    merchantName: "Starbucks",
    categoryName: "Treats",
  },
  {
    amount: monthOffset === 0 ? -2899 : addTenPercentVariance(-2899),
    date: addDays(baseDate, 4),
    transactionDetails: "Lunch burrito bowl",
    merchantName: "Chipotle",
    categoryName: "Fast Food",
  },
  {
    amount: monthOffset === 0 ? -6899 : addTenPercentVariance(-6899),
    date: addDays(baseDate, 5),
    transactionDetails: "Household supplies",
    merchantName: "Target",
    categoryName: "Shopping",
  },
  {
    amount: monthOffset === 0 ? -8423 : addTenPercentVariance(-8423),
    date: addDays(baseDate, 6),
    transactionDetails: "Weekly groceries",
    merchantName: "Trader Joe's",
    categoryName: "Groceries",
  },
  {
    amount: monthOffset === 0 ? -12499 : addTenPercentVariance(-12499),
    date: addDays(baseDate, 7),
    transactionDetails: "Dinner out",
    merchantName: "Restaurant",
    categoryName: "Restaurants",
  },
  {
    amount: monthOffset === 0 ? -4599 : addTenPercentVariance(-4599),
    date: addDays(baseDate, 8),
    transactionDetails: "Wireless bill",
    merchantName: "Verizon",
    categoryName: "Phone Bill",
  },
  {
    amount: monthOffset === 0 ? -7399 : addTenPercentVariance(-7399),
    date: addDays(baseDate, 9),
    transactionDetails: "Internet service",
    merchantName: "Comcast",
    categoryName: "Internet",
  },
  {
    amount: monthOffset === 0 ? -1599 : addTenPercentVariance(-1599),
    date: addDays(baseDate, 10),
    transactionDetails: "Monthly music subscription",
    merchantName: "Spotify",
    categoryName: "Subscriptions",
  },
  {
    amount: monthOffset === 0 ? -1999 : addTenPercentVariance(-1999),
    date: addDays(baseDate, 12),
    transactionDetails: "Streaming subscription",
    merchantName: "Netflix",
    categoryName: "Subscriptions",
  },
  {
    amount: monthOffset === 0 ? -32499 : addTenPercentVariance(-32499),
    date: addDays(baseDate, 13),
    transactionDetails: "Electronics accessories",
    merchantName: "Best Buy",
    categoryName: "Shopping",
  },
  {
    amount: monthOffset === 0 ? -21999 : addTenPercentVariance(-21999),
    date: addDays(baseDate, 14),
    transactionDetails: "Home improvement supplies",
    merchantName: "Home Depot",
    categoryName: "Shopping",
  },
  {
    amount: monthOffset === 0 ? -9623 : addTenPercentVariance(-9623),
    date: addDays(baseDate, 15),
    transactionDetails: "Groceries and snacks",
    merchantName: "Costco",
    categoryName: "Groceries",
  },
  {
    amount: monthOffset === 0 ? -1780 : addTenPercentVariance(-1780),
    date: addDays(baseDate, 16),
    transactionDetails: "Drive-thru meal",
    merchantName: "McDonald's",
    categoryName: "Fast Food",
  },
  {
    amount: monthOffset === 0 ? -4500 : addTenPercentVariance(-4500),
    date: addDays(baseDate, 17),
    transactionDetails: "Gas top-up",
    merchantName: "Shell",
    categoryName: "Gas",
  },
  {
    amount: monthOffset === 0 ? -3500 : addTenPercentVariance(-3500),
    date: addDays(baseDate, 18),
    transactionDetails: "Monthly gym membership",
    merchantName: "Local Gym",
    categoryName: "Gym Membership",
  },
  {
    amount: monthOffset === 0 ? -5000 : addTenPercentVariance(-5000),
    date: addDays(baseDate, 19),
    transactionDetails: "Donation",
    merchantName: "Red Cross",
    categoryName: "Donations",
  },
  {
    amount: monthOffset === 0 ? -1299 : addTenPercentVariance(-1299),
    date: addDays(baseDate, 20),
    transactionDetails: "Afternoon latte",
    merchantName: "Starbucks",
    categoryName: "Treats",
  },
  {
    amount: monthOffset === 0 ? -21345 : addTenPercentVariance(-21345),
    date: addDays(baseDate, 22),
    transactionDetails: "Groceries weekly run",
    merchantName: "Whole Foods",
    categoryName: "Groceries",
  },
  {
    amount: monthOffset === 0 ? -8999 : addTenPercentVariance(-8999),
    date: addDays(baseDate, 23),
    transactionDetails: "Dinner date",
    merchantName: "Restaurant",
    categoryName: "Restaurants",
  },
  {
    amount: monthOffset === 0 ? -2599 : addTenPercentVariance(-2599),
    date: addDays(baseDate, 24),
    transactionDetails: "Coffee and pastry",
    merchantName: "Starbucks",
    categoryName: "Treats",
  },
  {
    amount: monthOffset === 0 ? -12499 : addTenPercentVariance(-12499),
    date: addDays(baseDate, 26),
    transactionDetails: "Household restock",
    merchantName: "Target",
    categoryName: "Shopping",
  },
  {
    amount: monthOffset === 0 ? -3299 : addTenPercentVariance(-3299),
    date: addDays(baseDate, 27),
    transactionDetails: "Gas fill-up",
    merchantName: "Shell",
    categoryName: "Gas",
  },
];

const transactions = [
  ...buildMonthlyTransactions(getMonthStart(0), 0),
  ...buildMonthlyTransactions(getMonthStart(1), 1),
  ...buildMonthlyTransactions(getMonthStart(2), 2),
  ...buildMonthlyTransactions(getMonthStart(3), 3),
];

async function main() {
  try {
    console.log("Starting database seed...");
    const userId = await db.query.user.findFirst({
      columns: {
        id: true,
      },
    });
    if (!userId) {
      throw new Error("User not found");
    }
    // Clear existing categories first
    await db.delete(category);
    await db.insert(category).values(
      categories.map((category) => ({
        ...category,
        userId: userId.id,
      })),
    );
    const newCategories = await db.query.category.findMany({
      columns: {
        id: true,
        name: true,
      },
    });
    await db.delete(merchant);
    await db.insert(merchant).values(
      merchants.map((merchant) => ({
        ...merchant,
        userId: userId.id,
        recommendedCategoryId: newCategories.find(
          (category) => category.name === merchant.recommendedCategoryName,
        )?.id,
      })),
    );
    const newMerchants = await db.query.merchant.findMany({
      columns: {
        id: true,
        name: true,
      },
    });
    await db.delete(transaction);
    await db.insert(transaction).values(
      transactions.map((transaction) => ({
        ...transaction,
        userId: userId.id,
        merchantId: newMerchants.find(
          (merchant) => merchant.name === transaction.merchantName,
        )?.id,
        categoryId: newCategories.find(
          (category) => category.name === transaction.categoryName,
        )?.id,
        date: transaction.date.toISOString().split("T")[0],
        transactionDetails: transaction.transactionDetails,
        amount: transaction.amount,
        reviewed: true,
      })),
    );
    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

main();
