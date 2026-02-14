import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { authToken } from "../db/schema";
import { logger } from "./logger";

/**
 * Generate a secure random token of 64 characters
 */
export function generateAuthToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a token using bcrypt
 */
function hashToken(token: string): string {
  return bcrypt.hashSync(token, 10);
}

/**
 * Create or update an auth token for a user
 */
export async function createOrUpdateAuthToken(userId: string): Promise<string> {
  const token = generateAuthToken();
  const hashedToken = hashToken(token);

  try {
    // Check if user already has a token
    const existingToken = await db.query.authToken.findFirst({
      where: eq(authToken.userId, userId),
    });

    if (existingToken) {
      // Update existing token
      await db
        .update(authToken)
        .set({
          token: hashedToken,
          updatedAt: new Date(),
        })
        .where(eq(authToken.userId, userId));
    } else {
      // Create new token
      await db.insert(authToken).values({
        userId,
        token: hashedToken,
      });
    }

    logger.info(`Auth token created/updated for user ${userId}`);
    return token; // Return the original token, not the hashed one
  } catch (error) {
    logger.error("Failed to create/update auth token", {
      error,
      userId,
    });
    throw new Error("Failed to create auth token");
  }
}

/**
 * Validate an auth token and return the user ID if valid
 *
 * Note: Since tokens are hashed with bcrypt, we can't query by token directly.
 * However, we can optimize by checking tokens in batches or using a different
 * approach. For now, we'll iterate through all tokens, but this should be
 * optimized if the number of users grows significantly.
 *
 * Alternative approaches:
 * - Store a hash of the token (e.g., SHA256) alongside the bcrypt hash for quick lookup
 * - Use a different hashing scheme that allows direct comparison
 * - Limit the number of active tokens per user
 */
export async function validateAuthToken(token: string): Promise<string | null> {
  try {
    // Get all tokens (since we can't query by bcrypt hash directly)
    // TODO: Consider adding a SHA256 hash of the token for faster lookup
    const tokenRecords = await db.query.authToken.findMany();

    for (const tokenRecord of tokenRecords) {
      try {
        const isValid = bcrypt.compareSync(token, tokenRecord.token);
        if (isValid) {
          return tokenRecord.userId;
        }
      } catch (_verifyError) {
        // Continue to next token if verification fails
      }
    }

    return null;
  } catch (error) {
    logger.error("Failed to validate auth token", {
      error,
    });
    return null;
  }
}

/**
 * Delete an auth token for a user
 */
export async function deleteAuthToken(userId: string): Promise<void> {
  try {
    await db.delete(authToken).where(eq(authToken.userId, userId));
    logger.info(`Auth token deleted for user ${userId}`);
  } catch (error) {
    logger.error("Failed to delete auth token", {
      error,
      userId,
    });
    throw new Error("Failed to delete auth token");
  }
}
