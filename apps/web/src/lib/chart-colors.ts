// Shared categorical chart palette. The first eight entries reference the
// theme's --chart-* tokens so colors adapt to light/dark mode; the extras
// cover large category sets beyond eight.
export const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "#f59e0b", // amber
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#ea580c", // orange
];

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getColorFromCategoryId(categoryId: string): string {
  const hash = hashString(categoryId);
  return chartColors[hash % chartColors.length];
}
