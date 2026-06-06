import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "./db";
import { category, merchant, transaction } from "./db/schema";
import { validateAuthToken } from "./lib/auth-token";
import { logger } from "./lib/logger";
import {
  getTransactionWithRelations,
  handleKeywordAddition,
  handleKeywordRemoval,
  updateTransactionField,
  validateTransactionOwnership,
} from "./routers/transactions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DOCS_MD = readFileSync(
  join(__dirname, "external-api-docs.md"),
  "utf-8",
);

const externalApi = new Hono();

async function getUserIdFromBearerToken(c: Context): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
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

// GET /transactions/search - Broad search across transaction details, notes, merchant name, and category name
externalApi.get("/transactions/search", async (c) => {
  try {
    const userId = await getUserIdFromBearerToken(c);
    if (!userId) {
      return c.json(
        { error: "Missing, invalid, or expired Authorization header" },
        401,
      );
    }

    const q = c.req.query("q");
    if (!q || q.trim().length === 0) {
      return c.json({ error: "Search query 'q' is required" }, 400);
    }

    const page = Math.max(1, Number(c.req.query("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(c.req.query("pageSize") || "50")),
    );

    const searchPattern = `%${q}%`;

    const searchConditions = [
      eq(transaction.userId, userId),
      or(
        ilike(transaction.transactionDetails, searchPattern),
        ilike(transaction.notes, searchPattern),
        ilike(merchant.name, searchPattern),
        ilike(category.name, searchPattern),
      ),
    ];

    const [{ count }] = await db
      .select({ count: sql<number>`count(distinct ${transaction.id})` })
      .from(transaction)
      .leftJoin(merchant, eq(transaction.merchantId, merchant.id))
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(and(...searchConditions));

    const matchingIdsResult = await db
      .select({ id: transaction.id })
      .from(transaction)
      .leftJoin(merchant, eq(transaction.merchantId, merchant.id))
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(and(...searchConditions))
      .orderBy(desc(transaction.date), desc(transaction.amount))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const ids = matchingIdsResult.map((r) => r.id);

    let userTransactions: (typeof transaction.$inferSelect & {
      merchant: typeof merchant.$inferSelect | null;
      category:
        | (typeof category.$inferSelect & {
            parentCategory: typeof category.$inferSelect | null;
          })
        | null;
    })[] = [];
    if (ids.length > 0) {
      userTransactions = await db.query.transaction.findMany({
        where: inArray(transaction.id, ids),
        with: {
          merchant: true,
          category: { with: { parentCategory: true } },
        },
      });

      const orderMap = new Map(ids.map((id, index) => [id, index]));
      userTransactions.sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );
    }

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
    logger.error("API transaction search failed", {
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

// PATCH /transactions/:id - Update reviewed status, merchant, and/or category
externalApi.patch("/transactions/:id", async (c) => {
  try {
    const userId = await getUserIdFromBearerToken(c);
    if (!userId) {
      return c.json(
        { error: "Missing, invalid, or expired Authorization header" },
        401,
      );
    }

    const transactionId = c.req.param("id");
    const body = await c.req.json();

    const updateSchema = z
      .object({
        reviewed: z.boolean().optional(),
        merchantId: z.string().nullable().optional(),
        categoryId: z.string().nullable().optional(),
      })
      .refine(
        (data) =>
          data.reviewed !== undefined ||
          data.merchantId !== undefined ||
          data.categoryId !== undefined,
        {
          message:
            "At least one of reviewed, merchantId, or categoryId is required",
        },
      );

    const validationResult = updateSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json(
        {
          error: "Invalid request format",
          details: validationResult.error.issues,
        },
        400,
      );
    }

    const { reviewed, merchantId, categoryId } = validationResult.data;

    const currentTransaction = await validateTransactionOwnership(
      transactionId,
      userId,
    );

    if (merchantId) {
      const merchantRecord = await db.query.merchant.findFirst({
        where: and(eq(merchant.id, merchantId), eq(merchant.userId, userId)),
      });
      if (!merchantRecord) {
        return c.json({ error: "Merchant not found" }, 404);
      }
    }

    if (categoryId) {
      const categoryRecord = await db.query.category.findFirst({
        where: and(eq(category.id, categoryId), eq(category.userId, userId)),
      });
      if (!categoryRecord) {
        return c.json({ error: "Category not found" }, 404);
      }
    }

    let effectiveMerchantId = currentTransaction.merchantId;
    let effectiveCategoryId = currentTransaction.categoryId;

    if (merchantId !== undefined) {
      effectiveMerchantId = merchantId;
      if (categoryId === undefined) {
        const newMerchantRecord = merchantId
          ? await db.query.merchant.findFirst({
              where: eq(merchant.id, merchantId),
            })
          : null;
        effectiveCategoryId = newMerchantRecord?.recommendedCategoryId ?? null;
      }
    }

    if (categoryId !== undefined) {
      effectiveCategoryId = categoryId;
    }

    if (reviewed === true) {
      if (!effectiveMerchantId && !effectiveCategoryId) {
        return c.json(
          { error: "Assign a category and merchant before reviewing" },
          400,
        );
      }
      if (!effectiveCategoryId) {
        return c.json({ error: "Assign a category before reviewing" }, 400);
      }
      if (!effectiveMerchantId) {
        return c.json({ error: "Assign a merchant before reviewing" }, 400);
      }
    }

    const updates: Record<string, unknown> = {};

    if (reviewed !== undefined) {
      updates.reviewed = reviewed;
    }

    if (merchantId !== undefined) {
      if (
        currentTransaction.merchantId &&
        currentTransaction.merchantId !== merchantId
      ) {
        await handleKeywordRemoval(
          currentTransaction,
          currentTransaction.merchantId,
          transactionId,
        );
      }

      const newMerchantRecord = merchantId
        ? await db.query.merchant.findFirst({
            where: eq(merchant.id, merchantId),
            with: { keywords: true },
          })
        : null;

      updates.merchantId = merchantId;

      if (categoryId === undefined) {
        updates.categoryId = newMerchantRecord?.recommendedCategoryId ?? null;
      } else {
        updates.categoryId = categoryId;
      }

      await updateTransactionField(
        transactionId,
        updates,
        "updating transaction",
        userId,
      );

      if (merchantId) {
        await handleKeywordAddition(currentTransaction, merchantId, userId);
      }
    } else if (Object.keys(updates).length > 0 || categoryId !== undefined) {
      if (categoryId !== undefined) {
        updates.categoryId = categoryId;
      }

      await updateTransactionField(
        transactionId,
        updates,
        "updating transaction",
        userId,
      );
    }

    const updatedTransaction = await getTransactionWithRelations(transactionId);
    if (!updatedTransaction) {
      return c.json({ error: "Transaction not found" }, 404);
    }

    return c.json({ transaction: updatedTransaction });
  } catch (error) {
    logger.error("API transaction update failed", {
      error,
      metadata: {
        method: c.req.method,
        url: c.req.url,
      },
    });

    if (error instanceof Error) {
      if (error.message === "Transaction not found") {
        return c.json({ error: error.message }, 404);
      }
      if (error.message === "Unauthorized to update this transaction") {
        return c.json({ error: error.message }, 403);
      }
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
