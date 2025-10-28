import crypto from "node:crypto";
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
 * Hash a token using Bun's built-in crypto
 */
function hashToken(token: string): string {
  return Bun.password.hashSync(token, {
    algorithm: "bcrypt",
  });
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
 */
export async function validateAuthToken(token: string): Promise<string | null> {
  try {
    // We can't directly compare bcrypt hashes, so we need to find by a different approach
    // For now, let's get all tokens and verify them one by one
    // In a production system, you might want to add an index or use a different approach
    const tokenRecords = await db.query.authToken.findMany();

    for (const tokenRecord of tokenRecords) {
      try {
        const isValid = Bun.password.verifySync(token, tokenRecord.token);
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
