import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "./db";
import { category, merchant, transaction } from "./db/schema";
import { validateAuthToken } from "./lib/auth-token";
import { logger } from "./lib/logger";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DOCS_MD = readFileSync(
  join(__dirname, "external-api-docs.md"),
  "utf-8",
);

const externalApi = new Hono();

async function getUserIdFromBearerToken(c: Context): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  return validateAuthToken(token);
}

// POST /transactions - Create transactions
externalApi.post("/transactions", async (c) => {
  try {
    const userId = await getUserIdFromBearerToken(c);

    if (!userId) {
      return c.json(
        { error: "Missing, invalid, or expired Authorization header" },
        401,
      );
    }

    const body = await c.req.json();

    const transactionSchema = z.object({
      amount: z.number().int(),
      date: z.string().or(z.date()),
      transactionDetails: z.string(),
      merchantId: z.string().optional(),
      categoryId: z.string().optional(),
      notes: z.string().optional(),
      externalId: z.string(),
    });

    const requestSchema = z.object({
      transactions: z.array(transactionSchema).min(1).max(100),
    });

    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json(
        {
          error: "Invalid request format",
          details: validationResult.error.issues,
        },
        400,
      );
    }

    const { transactions } = validationResult.data;

    console.log("Transaction Count:", transactions.length);
    const { getMerchantFromVendor } = await import("./routers/merchants");

    const transactionData = await Promise.all(
      transactions.map(async (newTransaction) => {
        const merchantRecord = await getMerchantFromVendor(
          newTransaction.transactionDetails,
          userId,
        );

        return {
          ...newTransaction,
          merchantId: merchantRecord?.id,
          categoryId: merchantRecord?.recommendedCategoryId,
          userId: userId,
          date: new Date(newTransaction.date).toISOString().split("T")[0],
        };
      }),
    );

    const insertedTransactions = await db
      .insert(transaction)
      .values(transactionData)
      .onConflictDoNothing()
      .returning();

    const addedCount = insertedTransactions.length;

    return c.json({
      message: "Transactions received",
      count: addedCount,
    });
  } catch (error) {
    logger.error("API transaction creation failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
      },
    });

    if (error instanceof Error) {
      return c.json({ error: error.message }, 500);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /transactions - List transactions with filtering and pagination
externalApi.get("/transactions", async (c) => {
  try {
    const userId = await getUserIdFromBearerToken(c);
    if (!userId) {
      return c.json(
        { error: "Missing, invalid, or expired Authorization header" },
        401,
      );
    }

    const page = Math.max(1, Number(c.req.query("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(c.req.query("pageSize") || "50")),
    );
    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const categoryIdsParam = c.req.query("categoryIds");
    const merchantIdsParam = c.req.query("merchantIds");
    const amountMinParam = c.req.query("amountMin");
    const amountMaxParam = c.req.query("amountMax");
    const reviewedParam = c.req.query("reviewed");
    const search = c.req.query("search");

    const categoryIds = categoryIdsParam
      ? categoryIdsParam.split(",").filter(Boolean)
      : undefined;
    const merchantIds = merchantIdsParam
      ? merchantIdsParam.split(",").filter(Boolean)
      : undefined;
    const amountMin =
      amountMinParam !== undefined ? Number(amountMinParam) : undefined;
    const amountMax =
      amountMaxParam !== undefined ? Number(amountMaxParam) : undefined;
    const reviewed =
      reviewedParam !== undefined ? reviewedParam === "true" : undefined;

    const conditions = [];
    conditions.push(eq(transaction.userId, userId));

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const maxDate = thirtyDaysFromNow.toISOString().split("T")[0];
    conditions.push(lte(transaction.date, maxDate));

    if (dateFrom) conditions.push(gte(transaction.date, dateFrom));
    if (dateTo) conditions.push(lte(transaction.date, dateTo));
    if (categoryIds && categoryIds.length > 0) {
      conditions.push(inArray(transaction.categoryId, categoryIds));
    }
    if (merchantIds && merchantIds.length > 0) {
      conditions.push(inArray(transaction.merchantId, merchantIds));
    }
    if (amountMin !== undefined)
      conditions.push(gte(transaction.amount, amountMin));
    if (amountMax !== undefined)
      conditions.push(lte(transaction.amount, amountMax));
    if (reviewed !== undefined)
      conditions.push(eq(transaction.reviewed, reviewed));
    if (search) {
      conditions.push(
        or(
          ilike(transaction.transactionDetails, `%${search}%`),
          ilike(transaction.notes, `%${search}%`),
          ilike(transaction.id, `%${search}%`),
        ),
      );
    }

    const whereConditions = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transaction)
      .where(whereConditions);

    const userTransactions = await db.query.transaction.findMany({
      where: whereConditions,
      with: {
        merchant: true,
        category: { with: { parentCategory: true } },
      },
      orderBy: [desc(transaction.date), desc(transaction.amount)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return c.json({
      transactions: userTransactions,
      pagination: {
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    logger.error("API transaction listing failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
      },
    });
    if (error instanceof Error) {
      return c.json({ error: error.message }, 500);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /transactions/:id - Get a single transaction
externalApi.get("/transactions/:id", async (c) => {
  try {
    const userId = await getUserIdFromBearerToken(c);
    if (!userId) {
      return c.json(
        { error: "Missing, invalid, or expired Authorization header" },
        401,
      );
    }

    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Transaction ID is required" }, 400);
    }

    const txn = await db.query.transaction.findFirst({
      where: and(eq(transaction.id, id), eq(transaction.userId, userId)),
      with: {
        merchant: true,
        category: { with: { parentCategory: true } },
      },
    });

    if (!txn) {
      return c.json({ error: "Transaction not found" }, 404);
    }

    return c.json({ transaction: txn });
  } catch (error) {
    logger.error("API transaction fetch failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
      },
    });
    if (error instanceof Error) {
      return c.json({ error: error.message }, 500);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /categories - List categories for the authenticated user
externalApi.get("/categories", async (c) => {
  try {
    const userId = await getUserIdFromBearerToken(c);
    if (!userId) {
      return c.json(
        { error: "Missing, invalid, or expired Authorization header" },
        401,
      );
    }

    const categories = await db.query.category.findMany({
      where: eq(category.userId, userId),
      with: {
        parentCategory: true,
        subCategories: true,
      },
      orderBy: [category.name],
    });

    return c.json({ categories });
  } catch (error) {
    logger.error("API categories fetch failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
      },
    });
    if (error instanceof Error) {
      return c.json({ error: error.message }, 500);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /merchants - List merchants for the authenticated user
externalApi.get("/merchants", async (c) => {
  try {
    const userId = await getUserIdFromBearerToken(c);
    if (!userId) {
      return c.json(
        { error: "Missing, invalid, or expired Authorization header" },
        401,
      );
    }

    const merchants = await db.query.merchant.findMany({
      where: eq(merchant.userId, userId),
      with: {
        keywords: true,
        recommendedCategory: true,
      },
      orderBy: [merchant.name],
    });

    return c.json({ merchants });
  } catch (error) {
    logger.error("API merchants fetch failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
      },
    });
    if (error instanceof Error) {
      return c.json({ error: error.message }, 500);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /docs - Serve external API documentation
externalApi.get("/docs", (c) => {
  return c.text(API_DOCS_MD, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
  });
});

export default externalApi;
