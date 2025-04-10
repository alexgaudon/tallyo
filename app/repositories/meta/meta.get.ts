import { formatDateISO8601 } from "@/lib/utils";
import { keys } from "@/repositories/keys";
import { db } from "@/server/db";
import { category, transaction, userSettings } from "@/server/db/schema";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { getEvent } from "vinxi/http";

const $getUserMeta = createServerFn({ method: "GET" }).handler(async () => {
  const event = getEvent();
  const auth = event.context.auth;

  if (!auth.isAuthenticated) {
    return {
      firstDate: formatDateISO8601(new Date()),
      unreviewed: 0,
      topCategories: [],
      settings: {
        privacyMode: false,
      },
    };
  }

  const earliestTransaction = await db
    .select({
      date: sql<string>`${transaction.date}`,
    })
    .from(transaction)
    .where(and(eq(transaction.userId, auth.user.id)))
    .orderBy(asc(transaction.date))
    .limit(1); // Only fetch the earliest transaction

  const unreviewedCount = await db
    .select({
      count: count(),
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, auth.user.id),
        eq(transaction.reviewed, false),
      ),
    );

  const topCategories = await db
    .select({
      id: category.id,
      categoryName: category.name,
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.categoryId, category.id))
    .where(
      and(
        eq(transaction.userId, auth.user.id),
        eq(category.hideFromInsights, false),
      ),
    )
    .groupBy(category.id, category.name, category.color)
    .orderBy(desc(sql<number>`COUNT(${transaction.id})`))
    .limit(5);

  const firstDate =
    earliestTransaction[0]?.date ?? formatDateISO8601(new Date());

  const unreviewed = unreviewedCount.at(-1)?.count ?? 0;

  const settings = await db
    .select({
      privacyMode: userSettings.privacyMode,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, auth.user.id));

  if (settings.length === 0) {
    await db
      .insert(userSettings)
      .values({
        id: uuidv7(),
        userId: auth.user.id,
        privacyMode: false,
      })
      .execute();
  }

  return {
    firstDate,
    unreviewed,
    topCategories,
    settings: settings.at(0),
  };
});

export const getUserMeta = () =>
  queryOptions({
    refetchOnWindowFocus: true,
    queryKey: [...keys.meta.queries.all],
    queryFn: () => $getUserMeta(),
  });
