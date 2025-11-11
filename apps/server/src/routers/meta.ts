import { addDays, format } from "date-fns";
import { and, asc, count, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  account,
  category,
  merchant,
  settings,
  transaction,
  user,
} from "@/db/schema";
import { protectedProcedure } from "../lib/orpc";

export const metaRouter = {
  triggerWebhookRefresh: protectedProcedure.handler(async ({ context }) => {
    const webhookUrls = await db.query.settings.findFirst({
      where: eq(settings.userId, context.session?.user?.id),
      columns: {
        webhookUrls: true,
      },
    });

    const urls = webhookUrls?.webhookUrls ?? [];

    // Fetch to each webhook URL with POST (no data)
    const responses = await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          let responseBody: unknown = null;
          const contentType = response.headers.get("content-type");

          // Try to parse response body if available
          try {
            if (contentType?.includes("application/json")) {
              responseBody = await response.json();
            } else {
              const text = await response.text();
              responseBody = text || null;
            }
          } catch {
            // If parsing fails, responseBody stays null
          }

          return {
            url,
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            body: responseBody,
          };
        } catch (error) {
          return {
            url,
            success: false,
            status: null,
            statusText:
              error instanceof Error ? error.message : "Unknown error",
            body: null,
          };
        }
      }),
    );

    // Transform Promise.allSettled results into a cleaner format
    const results = responses.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          url: "unknown",
          success: false,
          status: null,
          statusText:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
          body: null,
        };
      }
    });

    return {
      results,
    };
  }),
  isOauthUserOrEmailUser: protectedProcedure.handler(async ({ context }) => {
    const userAccount = await db.query.account.findFirst({
      where: eq(account.userId, context.session?.user?.id),
    });

    // Check if user has a password (email/password authentication)
    const hasPassword =
      userAccount?.password !== null && userAccount?.password !== undefined;

    return {
      isOauthUser: !hasPassword,
      isEmailUser: hasPassword,
    };
  }),
  getUserMeta: protectedProcedure.handler(async ({ context }) => {
    const topFiveCategories = await db.query.category.findMany({
      where: eq(category.userId, context.session?.user?.id),
      orderBy: [desc(category.name)],
      limit: 5,
    });

    const topFiveMerchants = await db.query.merchant.findMany({
      where: eq(merchant.userId, context.session?.user?.id),
      orderBy: [desc(merchant.name)],
      limit: 5,
    });

    const userCreatedAt = await db.query.user.findFirst({
      where: eq(user.id, context.session?.user?.id),
      columns: {
        createdAt: true,
      },
    });

    const earliestTransactionDate = await db.query.transaction.findFirst({
      where: eq(transaction.userId, context.session?.user?.id),
      orderBy: [asc(transaction.date)],
      columns: {
        date: true,
      },
    });

    const transferCategoryId = await db.query.category.findFirst({
      where: and(
        eq(category.userId, context.session?.user?.id),
        eq(category.hideFromInsights, true),
        eq(category.name, "Transfer"),
      ),
    });

    const unreviewedTransactionCount = await db
      .select({ count: count() })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, context.session?.user?.id),
          eq(transaction.reviewed, false),
          lte(transaction.date, format(addDays(new Date(), 30), "yyyy-MM-dd")),
        ),
      );

    return {
      topFiveCategories,
      topFiveMerchants,
      userCreatedAt: userCreatedAt?.createdAt,
      transferCategoryId: transferCategoryId?.id ?? null,
      earliestTransactionDate:
        earliestTransactionDate?.date ?? format(new Date(), "yyyy-MM-dd"),
      unreviewedTransactionCount: unreviewedTransactionCount[0]?.count ?? 0,
    };
  }),
};
