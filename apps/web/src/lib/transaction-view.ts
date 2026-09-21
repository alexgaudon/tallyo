import { keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { orpc } from "@/utils/orpc";

/**
 * The URL shape of a transaction view. This is the single serializable
 * representation every ledger surface uses; it maps 1:1 onto the server's
 * `transactionViewSchema`.
 */
export const viewSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categories: z.array(z.string()).optional(),
  merchants: z.array(z.string()).optional(),
  q: z.string().optional(),
  review: z.enum(["all", "reviewed", "unreviewed"]).default("all"),
  noMerchant: z.boolean().optional(),
  side: z.enum(["all", "income", "expense"]).default("all"),
  // Amounts are dollars in the URL; converted to integer cents below.
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  sort: z.enum(["date", "amount"]).default("date"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type ViewSearch = z.infer<typeof viewSearchSchema>;

export type ViewScope = "ledger" | "insights";

export const DEFAULT_VIEW_SEARCH: ViewSearch = viewSearchSchema.parse({});

const dollarsToCents = (value: number | undefined) =>
  value === undefined ? undefined : Math.round(value * 100);

/** The filter half of a view (everything except pagination and ordering). */
export function viewToFilter(search: ViewSearch, scope: ViewScope = "ledger") {
  const amount =
    search.min !== undefined || search.max !== undefined
      ? {
          min: dollarsToCents(search.min),
          max: dollarsToCents(search.max),
        }
      : undefined;

  return {
    scope,
    range:
      search.from && search.to
        ? { from: search.from, to: search.to }
        : undefined,
    categories: search.categories?.length ? search.categories : undefined,
    merchants: search.merchants?.length ? search.merchants : undefined,
    text: search.q || undefined,
    reviewState: search.review,
    withoutMerchant: search.noMerchant,
    side: search.side,
    amount,
  };
}

/** The full paginated input for `transactions.getView`. */
export function viewToInput(search: ViewSearch, scope: ViewScope = "ledger") {
  return {
    ...viewToFilter(search, scope),
    sort: search.sort,
    page: search.page,
    pageSize: search.pageSize,
  };
}

/** Loader/query options for the paginated ledger. */
export function viewQueryOptions(
  search: ViewSearch,
  scope: ViewScope = "ledger",
) {
  return orpc.transactions.getView.queryOptions({
    input: viewToInput(search, scope),
    placeholderData: keepPreviousData,
  });
}

/** Aggregate summary over the whole filtered set (not just the page). */
export function viewSummaryQueryOptions(
  search: ViewSearch,
  scope: ViewScope = "ledger",
) {
  return orpc.transactions.getViewSummary.queryOptions({
    input: viewToFilter(search, scope),
    placeholderData: keepPreviousData,
  });
}

export function hasActiveViewFilters(search: ViewSearch): boolean {
  return Boolean(
    search.from ||
      search.to ||
      search.categories?.length ||
      search.merchants?.length ||
      search.q ||
      search.noMerchant ||
      search.side !== "all" ||
      search.review !== "all" ||
      search.min !== undefined ||
      search.max !== undefined,
  );
}

/** Removes every filter while preserving pagination and ordering. */
export function clearedViewSearch(search: ViewSearch): ViewSearch {
  return {
    ...DEFAULT_VIEW_SEARCH,
    sort: search.sort,
    pageSize: search.pageSize,
  };
}
