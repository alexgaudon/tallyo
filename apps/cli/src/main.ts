#!/usr/bin/env bun

import { existsSync } from "node:fs";
import {
  type APITransaction,
  type UploadProgress,
  uploadTransactions,
} from "./api-client";
import { getAuthToken, setApiUrl, setAuthToken } from "./config";
import { mapQFXToAPI, parseQFXFile } from "./qfx";
import { generatePreviewText } from "./ui/preview";
import { generateProgressText } from "./ui/progress";

interface CLIArgs {
  file?: string;
  token?: string;
  apiUrl?: string;
  help?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--file" || arg === "-f") {
      result.file = args[++i];
    } else if (arg === "--token" || arg === "-t") {
      result.token = args[++i];
    } else if (arg === "--api-url" || arg === "-a") {
      result.apiUrl = args[++i];
    } else if (!arg.startsWith("-") && !result.file) {
      result.file = arg;
    }
  }

  return result;
}

function printHelp() {
  console.log(`
Tallyo CLI Tool

Usage:
  tallyo [options] <file>

Options:
  -f, --file <path>     Path to QFX file to import
  -t, --token <token>   API authentication token (saved to config)
  -a, --api-url <url>   API base URL (default: http://localhost:3000)
  -h, --help           Show this help message

Examples:
  tallyo transactions.qfx
  tallyo --file transactions.qfx --token abc123
  tallyo -f transactions.qfx -t abc123 -a http://localhost:3000
`);
}

async function promptUser(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (!wasRaw) {
      stdin.setRawMode(true);
    }
    stdin.setEncoding("utf8");

    const onData = (data: Buffer) => {
      const input = data.toString().trim();
      if (input === "\r" || input === "\n" || input.length > 0) {
        stdin.removeListener("data", onData);
        if (!wasRaw) {
          stdin.setRawMode(false);
        }
        resolve(input === "\r" || input === "\n" ? "" : input);
      }
    };

    stdin.once("data", onData);
  });
}

async function confirmUpload(): Promise<boolean> {
  const answer = await promptUser("Proceed with upload? (y/n): ");
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

function clearScreen() {
  process.stdout.write("\x1B[2J\x1B[H");
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.file) {
    console.error("Error: QFX file path is required");
    printHelp();
    process.exit(1);
  }

  if (!existsSync(args.file)) {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }

  if (args.apiUrl) {
    setApiUrl(args.apiUrl);
  }

  if (args.token) {
    setAuthToken(args.token);
  } else {
    const existingToken = getAuthToken();
    if (!existingToken) {
      console.error(
        "Error: Authentication token not found. Please provide one using --token flag.",
      );
      console.log("\nYou can set it with: --token <your-token>");
      process.exit(1);
    }
  }

  try {
    console.log(`\nParsing QFX file: ${args.file}...`);
    const parsedQFX = await parseQFXFile(args.file);

    if (parsedQFX.transactions.length === 0) {
      console.error("Error: No transactions found in QFX file.");
      process.exit(1);
    }

    console.log(
      `Found ${parsedQFX.transactions.length} transaction(s) in QFX file.\n`,
    );

    console.log("Mapping transactions to API format...");
    const apiTransactions: APITransaction[] = [];
    const mappingErrors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < parsedQFX.transactions.length; i++) {
      try {
        const mapped = mapQFXToAPI(parsedQFX.transactions[i]);
        apiTransactions.push(mapped);
      } catch (error) {
        mappingErrors.push({
          index: i + 1,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (mappingErrors.length > 0) {
      console.warn(
        `\nWarning: ${mappingErrors.length} transaction(s) failed to map:`,
      );
      for (const err of mappingErrors) {
        console.warn(`  Transaction ${err.index}: ${err.error}`);
      }
      console.log("");
    }

    if (apiTransactions.length === 0) {
      console.error("Error: No valid transactions to upload after mapping.");
      process.exit(1);
    }

    clearScreen();
    console.log(generatePreviewText(apiTransactions));
    console.log("\n");

    const confirmed = await confirmUpload();
    if (!confirmed) {
      console.log("\nUpload cancelled.");
      process.exit(0);
    }

    console.log("\nStarting upload...\n");

    const result = await uploadTransactions(apiTransactions, (progress) => {
      clearScreen();
      console.log(generateProgressText(progress));
    });

    clearScreen();
    console.log("=".repeat(80));
    console.log("UPLOAD COMPLETE");
    console.log("=".repeat(80));
    console.log("");
    console.log(`Total Transactions: ${apiTransactions.length}`);
    console.log(`Successfully Uploaded: ${result.totalUploaded}`);
    console.log(`Failed: ${result.totalFailed}`);

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      for (const error of result.errors) {
        console.log(`  Batch ${error.batch}: ${error.error}`);
      }
    }

    console.log("");
    console.log("=".repeat(80));

    if (result.success) {
      console.log("\n✓ All transactions uploaded successfully!");
      process.exit(0);
    } else {
      console.log("\n✗ Some transactions failed to upload.");
      process.exit(1);
    }
  } catch (error) {
    console.error(
      "\nError:",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
