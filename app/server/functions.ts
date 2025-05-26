import { formatDateISO8601 } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, sql } from "drizzle-orm";
import { getEvent } from "vinxi/http";
import type { Auth } from "./auth";
import { db } from "./db";
import { transaction } from "./db/schema";

export const getAuth = createServerFn({ method: "GET" }).handler(async (): Promise<Auth> => {
  const event = getEvent();

  return event.context.auth;
});

export const $getEarliestTransactionDate = createServerFn({
  method: "GET",
}).handler(async () => {
  const event = getEvent();
  const auth = event.context.auth;

  if (!auth.isAuthenticated) {
    return new Date();
  }

  const earliestTransaction = await db
    .select({
      date: sql<string>`${transaction.date}`,
    })
    .from(transaction)
    .where(and(eq(transaction.userId, auth.user.id)))
    .orderBy(asc(transaction.date))
    .limit(1); // Only fetch the earliest transaction

  return earliestTransaction[0]?.date ?? formatDateISO8601(new Date());
});
