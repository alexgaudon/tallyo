import type { APITransaction } from "../api-client";

export interface PreviewProps {
  transactions: APITransaction[];
}

/**
 * Format amount from cents to dollars for display
 */
function formatAmount(cents: number): string {
  const dollars = cents / 100;
  return dollars.toFixed(2);
}

/**
 * Generate preview text for transactions table
 */
export function generatePreviewText(transactions: APITransaction[]): string {
  if (transactions.length === 0) {
    return "No transactions to preview.";
  }

  const lines: string[] = [];
  lines.push("=".repeat(100));
  lines.push("TRANSACTION PREVIEW");
  lines.push("=".repeat(100));
  lines.push("");

  lines.push(
    `${"Date".padEnd(12)} | ${"Amount".padEnd(12)} | ${"Description".padEnd(50)} | ${"External ID".padEnd(20)}`,
  );
  lines.push("-".repeat(100));

  const displayCount = Math.min(transactions.length, 50);
  for (let i = 0; i < displayCount; i++) {
    const txn = transactions[i];
    const date = txn.date.padEnd(12);
    const amount = formatAmount(txn.amount).padEnd(12);
    const desc = txn.transactionDetails.substring(0, 50).padEnd(50);
    const extId = (txn.externalId || "").substring(0, 20).padEnd(20);

    lines.push(`${date} | ${amount} | ${desc} | ${extId}`);
  }

  if (transactions.length > 50) {
    lines.push("");
    lines.push(`... and ${transactions.length - 50} more transactions`);
  }

  lines.push("");
  lines.push("=".repeat(100));
  lines.push(`Total Transactions: ${transactions.length}`);

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const minDate = transactions.reduce(
    (min, t) => (t.date < min ? t.date : min),
    transactions[0]?.date || "",
  );
  const maxDate = transactions.reduce(
    (max, t) => (t.date > max ? t.date : max),
    transactions[0]?.date || "",
  );

  lines.push(`Date Range: ${minDate} to ${maxDate}`);
  lines.push(`Total Amount: $${formatAmount(totalAmount)}`);
  lines.push("=".repeat(100));

  return lines.join("\n");
}
