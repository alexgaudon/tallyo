import type { UploadProgress } from "../api-client";

/**
 * Generate progress text for upload
 */
export function generateProgressText(progress: UploadProgress): string {
  const lines: string[] = [];
  lines.push("=".repeat(80));
  lines.push("UPLOAD PROGRESS");
  lines.push("=".repeat(80));
  lines.push("");

  const percentage =
    progress.total > 0
      ? Math.round((progress.uploaded / progress.total) * 100)
      : 0;

  const barWidth = 50;
  const filled = Math.round((progress.uploaded / progress.total) * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

  lines.push(`Batch: ${progress.currentBatch} / ${progress.totalBatches}`);
  lines.push(`Progress: [${bar}] ${percentage}%`);
  lines.push(`Uploaded: ${progress.uploaded} / ${progress.total} transactions`);
  lines.push(
    `Success: ${progress.successCount} | Errors: ${progress.errorCount}`,
  );
  lines.push("");

  if (progress.errors.length > 0) {
    lines.push("Recent Errors:");
    const recentErrors = progress.errors.slice(-5);
    for (const error of recentErrors) {
      lines.push(`  Batch ${error.batch}: ${error.error.substring(0, 60)}`);
    }
    if (progress.errors.length > 5) {
      lines.push(`  ... and ${progress.errors.length - 5} more errors`);
    }
    lines.push("");
  }

  lines.push("=".repeat(80));

  return lines.join("\n");
}
