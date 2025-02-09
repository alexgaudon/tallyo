import { formatDateISO8601 } from "@/lib/utils";
import { matchDisplayVendor } from "@/repositories/transactions/matchDisplayVendor";
import { db } from "@/server/db";
import { authToken, transaction } from "@/server/db/schema";

import { json } from "@tanstack/start";
import { createAPIFileRoute } from "@tanstack/start/api";
import { and, eq } from "drizzle-orm";
import Fuse from "fuse.js";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

async function getUserIdFromAuthToken(token: string): Promise<string | null> {
  const dbToken = await db
    .select()
    .from(authToken)
    .where(eq(authToken.token, token));
  if (dbToken.length === 0) {
    return null;
  }

  return dbToken[0].userId;
}

const requestSchema = z.array(
  z.object({
    date: z.string().transform((arg) => formatDateISO8601(new Date(arg))),
    vendor: z.string(),
    amount: z.number(),
    externalId: z.string(),
    matchVendor: z.boolean().optional(),
  }),
);

const getUnauthorized = () => {
  return json(
    { ok: false, message: "Unauthorized" },
    {
      status: 401,
    },
  );
};

const getCategoryForVendor = async (vendor: string, userId: string) => {
  const reviewedTransactions = await db
    .select()
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.vendor, vendor),
        eq(transaction.reviewed, true),
      ),
    );

  let categoryId;

  if (reviewedTransactions.length > 0) {
    categoryId = reviewedTransactions.at(0)?.categoryId ?? null;
  } else {
    const allReviewedTransactions = await db
      .select({
        vendor: transaction.vendor,
        categoryId: transaction.categoryId,
      })
      .from(transaction)
      .where(
        and(eq(transaction.userId, userId), eq(transaction.reviewed, true)),
      );

    const fuse = new Fuse(allReviewedTransactions, {
      keys: ["vendor"],
      threshold: 0.3,
    });

    const fuzzyResults = fuse.search(vendor);

    if (fuzzyResults.length > 0) {
      categoryId = fuzzyResults[0].item.categoryId;
    } else {
      categoryId = null;
    }
  }

  if (categoryId === null) {
    return null;
  }

  return categoryId;
};

export const APIRoute = createAPIFileRoute("/api/new-transactions")({
  POST: async ({ request }) => {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token == undefined) {
      return getUnauthorized();
    }

    const user = await getUserIdFromAuthToken(token);

    if (user === null) {
      return getUnauthorized();
    }

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (parseResult.error) {
      return json(parseResult.error, {
        status: 500,
      });
    }

    try {
      const allValues = [];
      for (const transaction of parseResult.data) {
        allValues.push({
          ...transaction,
          displayVendor: transaction.matchVendor
            ? await matchDisplayVendor(user, transaction.vendor)
            : transaction.vendor,
          date: formatDateISO8601(new Date(transaction.date)),
          id: uuidv7(),
          userId: user,
          categoryId: await getCategoryForVendor(transaction.vendor, user),
        });
      }
      const res = await db
        .insert(transaction)
        .values(allValues)
        .onConflictDoNothing()
        .execute();

      return json({
        ok: true,
        message: `Added ${res.rowsAffected} transactions.`,
      });
    } catch (e) {
      return json({
        ok: false,
        message: (e as Error).message,
      });
    }
  },
});
