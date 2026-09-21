import { keepPreviousData } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/** The canvas date range, already serialized to `yyyy-MM-dd` strings. */
export interface CanvasRange {
  from?: string;
  to?: string;
}

/**
 * The single description of the dashboard canvas query. The route loader and
 * the component both read from here so the cache key and input stay in sync.
 */
export function canvasOverviewQueryOptions(range: CanvasRange) {
  return orpc.dashboard.getCanvasOverview.queryOptions({
    input: { range },
    placeholderData: keepPreviousData,
  });
}
