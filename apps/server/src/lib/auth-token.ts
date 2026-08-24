import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { eq, isNull } from "drizzle-orm";
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
 * Deterministically hash a token for indexed lookup. Tokens are 256-bit
 * random secrets (not passwords), so a fast hash is appropriate here.
 */
function hashTokenForLookup(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Bcrypt hash kept for legacy rows created before token_hash existed.
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
  const tokenHash = hashTokenForLookup(token);

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
          tokenHash,
          updatedAt: new Date(),
        })
        .where(eq(authToken.userId, userId));
    } else {
      // Create new token
      await db.insert(authToken).values({
        userId,
        token: hashedToken,
        tokenHash,
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
 * Validate an auth token and return the user ID if valid.
 *
 * Tokens are high-entropy random secrets stored as SHA-256 digests, so
 * validation is a single indexed lookup. Rows created before token_hash
 * existed only carry a bcrypt digest; those are validated via the legacy
 * comparison scan until regenerated from settings.
 */
export async function validateAuthToken(token: string): Promise<string | null> {
  try {
    const tokenHash = hashTokenForLookup(token);
    const record = await db.query.authToken.findFirst({
      where: eq(authToken.tokenHash, tokenHash),
      columns: { userId: true },
    });

    if (record) {
      return record.userId;
    }

    // Legacy fallback: bcrypt-only rows predating token_hash.
    const legacyRecords = await db.query.authToken.findMany({
      where: isNull(authToken.tokenHash),
    });

    for (const tokenRecord of legacyRecords) {
      try {
        if (bcrypt.compareSync(token, tokenRecord.token)) {
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
