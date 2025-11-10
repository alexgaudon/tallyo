import type { APITransaction } from "./api-client";

export interface QFXTransaction {
  datePosted: string;
  amount: number;
  name: string;
  memo?: string;
  fitId?: string;
  type?: string;
}

export interface ParsedQFX {
  transactions: QFXTransaction[];
  accountType?: string;
  accountId?: string;
  bankId?: string;
  currency?: string;
}

/**
 * Parse a QFX/OFX file and extract transaction data using simple string parsing
 * This approach is more robust than trying to convert SGML to XML
 */
export async function parseQFXFile(filePath: string): Promise<ParsedQFX> {
  try {
    const fileContent = await Bun.file(filePath).text();

    const statements = fileContent.split("<STMTTRN>");
    const transactions: QFXTransaction[] = [];

    for (let i = 1; i < statements.length; i++) {
      const stmt = statements[i];
      const parts = stmt.split("</STMTTRN");

      if (parts.length > 1) {
        const transactionContent = parts[0]
          .replaceAll("\n", "")
          .replaceAll("\r", "");

        const fieldParts = transactionContent
          .split("<")
          .filter((x) => x.trim() !== "");
        const temp: Record<string, string> = {};

        for (const part of fieldParts) {
          const split = part.split(">");
          if (split.length >= 2) {
            const tagName = split[0].trim();
            const value = split.slice(1).join(">").trim();

            if (tagName === "DTPOSTED") {
              if (value.length >= 8) {
                const dateStr = value.substring(0, 8);
                temp[tagName] =
                  `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
              }
            } else {
              temp[tagName] = value;
            }
          }
        }

        if (temp.DTPOSTED && temp.TRNAMT && temp.FITID && temp.NAME) {
          const amount = parseFloat(temp.TRNAMT || "0");

          transactions.push({
            datePosted: temp.DTPOSTED,
            amount,
            name: temp.NAME,
            memo: temp.MEMO,
            fitId: temp.FITID,
            type: temp.TRNTYPE,
          });
        }
      }
    }

    if (transactions.length === 0) {
      throw new Error("No transactions found in QFX file.");
    }

    return {
      transactions,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse QFX file: ${error.message}`);
    }
    throw new Error("Failed to parse QFX file: Unknown error");
  }
}

/**
 * Map QFX transaction data to API transaction format
 */
export function mapQFXToAPI(qfxTransaction: QFXTransaction): APITransaction {
  if (!qfxTransaction.datePosted) {
    throw new Error("Transaction missing required field: datePosted");
  }
  if (qfxTransaction.name === undefined || qfxTransaction.name === null) {
    throw new Error("Transaction missing required field: name");
  }
  if (qfxTransaction.amount === undefined || qfxTransaction.amount === null) {
    throw new Error("Transaction missing required field: amount");
  }

  const amountInCents = Math.round(qfxTransaction.amount * 100);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(qfxTransaction.datePosted)) {
    throw new Error(
      `Invalid date format: ${qfxTransaction.datePosted}. Expected YYYY-MM-DD format.`,
    );
  }

  const transactionDetails = qfxTransaction.memo
    ? `${qfxTransaction.name} - ${qfxTransaction.memo}`
    : qfxTransaction.name;

  const externalId = qfxTransaction.fitId;

  if (!externalId) {
    throw new Error("Transaction external ID is missing");
  }

  const notes = qfxTransaction.memo || undefined;

  return {
    amount: amountInCents,
    date: qfxTransaction.datePosted,
    transactionDetails,
    notes,
    externalId,
  };
}
