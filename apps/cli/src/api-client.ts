import { getApiUrl, getAuthToken } from "./config";

export interface APITransaction {
  amount: number; // integer in cents
  date: string; // YYYY-MM-DD format
  transactionDetails: string;
  merchantId?: string;
  categoryId?: string;
  notes?: string;
  externalId: string;
}

const BATCH_SIZE = 100;

export interface UploadProgress {
  currentBatch: number;
  totalBatches: number;
  uploaded: number;
  total: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ batch: number; error: string }>;
}

export interface UploadResult {
  success: boolean;
  totalUploaded: number;
  totalFailed: number;
  errors: Array<{ batch: number; error: string }>;
}

/**
 * Upload transactions to the API in batches
 */
export async function uploadTransactions(
  transactions: APITransaction[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  if (transactions.length === 0) {
    throw new Error("No transactions to upload");
  }

  const authToken = getAuthToken();
  if (!authToken) {
    throw new Error(
      "Authentication token not found. Please set it using --token flag or config.",
    );
  }

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error("API URL not configured");
  }

  const batches = chunkArray(transactions, BATCH_SIZE);
  const totalBatches = batches.length;

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ batch: number; error: string }> = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const currentBatch = i + 1;

    try {
      const response = await fetch(`${apiUrl}/api/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          transactions: batch,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${errorText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
          if (errorJson.details) {
            errorMessage += ` - ${JSON.stringify(errorJson.details)}`;
          }
        } catch {
          // Use errorText as-is if not JSON
        }

        errorCount += batch.length;
        errors.push({ batch: currentBatch, error: errorMessage });
      } else {
        const result = await response.json();
        const addedCount = result.count || batch.length;
        successCount += addedCount;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errorCount += batch.length;
      errors.push({ batch: currentBatch, error: errorMessage });
    }

    if (onProgress) {
      onProgress({
        currentBatch,
        totalBatches,
        uploaded: successCount,
        total: transactions.length,
        successCount,
        errorCount,
        errors,
      });
    }
  }

  return {
    success: errorCount === 0,
    totalUploaded: successCount,
    totalFailed: errorCount,
    errors,
  };
}

/**
 * Chunk an array into smaller arrays of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
