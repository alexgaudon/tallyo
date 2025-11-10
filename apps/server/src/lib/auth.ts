import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { account, session, user } from "../db/schema/auth";

// Validate required environment variables
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

if (!DISCORD_CLIENT_ID) {
  throw new Error("DISCORD_CLIENT_ID environment variable is required");
}
if (!DISCORD_CLIENT_SECRET) {
  throw new Error("DISCORD_CLIENT_SECRET environment variable is required");
}
if (!CORS_ORIGIN) {
  throw new Error("CORS_ORIGIN environment variable is required");
}

// Discord redirect URI - must match exactly what's configured in Discord app settings
const DISCORD_REDIRECT_URI =
  process.env.DISCORD_REDIRECT_URI ||
  `${CORS_ORIGIN}/api/auth/callback/discord`;

// Session duration: 30 days
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string;
  verified: boolean;
}

/**
 * Generate a secure random session token
 */
function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Get Discord OAuth authorization URL
 */
export function getDiscordAuthUrl(state: string): string {
  const scope = "identify email";
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID || "",
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope,
    state,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Validate OAuth code format
 */
function validateCode(code: string | undefined): string {
  if (!code || typeof code !== "string") {
    throw new Error("Invalid authentication code");
  }
  // Discord codes are typically alphanumeric, 30-100 characters
  if (code.length < 30 || code.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(code)) {
    throw new Error("Invalid authentication code format");
  }
  return code;
}

/**
 * Exchange Discord OAuth code for access token
 */
async function exchangeCodeForToken(code: string): Promise<string> {
  const validatedCode = validateCode(code);

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID || "",
      client_secret: DISCORD_CLIENT_SECRET || "",
      grant_type: "authorization_code",
      code: validatedCode,
      redirect_uri: DISCORD_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    // Don't leak Discord API error details
    throw new Error("Authentication failed");
  }

  const data = await response.json();
  if (!data.access_token || typeof data.access_token !== "string") {
    throw new Error("Authentication failed");
  }
  return data.access_token;
}

/**
 * Get Discord user info from access token
 */
async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Authentication failed");
  }

  const data = await response.json();

  // Validate required fields
  if (!data.id || !data.username || !data.email) {
    throw new Error("Authentication failed");
  }

  return {
    id: String(data.id),
    username: String(data.username),
    discriminator: String(data.discriminator || "0"),
    avatar: data.avatar ? String(data.avatar) : null,
    email: String(data.email),
    verified: Boolean(data.verified),
  };
}

/**
 * Check if any users exist in the database
 */
export async function hasUsers(): Promise<boolean> {
  const users = await db.select().from(user).limit(1);
  return users.length > 0;
}

/**
 * Get the existing user's Discord account ID
 */
async function getExistingDiscordAccountId(): Promise<string | null> {
  const existingAccount = await db
    .select()
    .from(account)
    .where(eq(account.providerId, "discord"))
    .limit(1);

  return existingAccount[0]?.accountId || null;
}

/**
 * Create or update user from Discord OAuth
 */
export async function handleDiscordCallback(
  code: string,
  isRegister: boolean,
): Promise<{ sessionToken: string; userId: string }> {
  // Exchange code for access token
  const accessToken = await exchangeCodeForToken(code);

  // Get Discord user info
  const discordUser = await getDiscordUser(accessToken);

  // Check if users exist
  const usersExist = await hasUsers();

  if (usersExist) {
    // If users exist, only allow the original user to sign in
    const existingDiscordId = await getExistingDiscordAccountId();

    if (!existingDiscordId) {
      throw new Error("Authentication failed");
    }

    if (discordUser.id !== existingDiscordId) {
      throw new Error("Authentication failed");
    }

    // Find existing user
    const existingAccount = await db
      .select()
      .from(account)
      .where(eq(account.accountId, discordUser.id))
      .limit(1);

    if (existingAccount.length === 0) {
      throw new Error("Authentication failed");
    }

    const userId = existingAccount[0].userId;

    // Update account with new access token
    await db
      .update(account)
      .set({
        accessToken,
        updatedAt: new Date(),
      })
      .where(eq(account.id, existingAccount[0].id));

    // Get current user data
    const currentUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (currentUser.length > 0) {
      // Calculate new image URL from Discord
      const newImage = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

      // Update user profile picture from Discord only if it's different
      if (currentUser[0].image !== newImage) {
        await db
          .update(user)
          .set({
            image: newImage,
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId));
      }
    }

    // Create new session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await db.insert(session).values({
      id: sessionToken,
      userId,
      token: sessionToken,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { sessionToken, userId };
  } else {
    // No users exist - create the first user
    if (!isRegister) {
      throw new Error("Authentication failed");
    }

    // Create user
    const userId = `user_${discordUser.id}`;
    const now = new Date();

    await db.insert(user).values({
      id: userId,
      name: discordUser.username,
      email: discordUser.email,
      emailVerified: discordUser.verified,
      image: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
      createdAt: now,
      updatedAt: now,
    });

    // Create account
    await db.insert(account).values({
      id: `account_${discordUser.id}`,
      accountId: discordUser.id,
      providerId: "discord",
      userId,
      accessToken,
      createdAt: now,
      updatedAt: now,
    });

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await db.insert(session).values({
      id: sessionToken,
      userId,
      token: sessionToken,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return { sessionToken, userId };
  }
}

/**
 * Get session from token
 */
export async function getSession(sessionToken: string | null): Promise<{
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
} | null> {
  if (!sessionToken) {
    return null;
  }

  const sessionData = await db
    .select()
    .from(session)
    .where(eq(session.token, sessionToken))
    .limit(1);

  if (sessionData.length === 0) {
    return null;
  }

  const sess = sessionData[0];

  // Check if session is expired
  if (sess.expiresAt < new Date()) {
    // Delete expired session
    await db.delete(session).where(eq(session.id, sess.id));
    return null;
  }

  // Get user
  const userData = await db
    .select()
    .from(user)
    .where(eq(user.id, sess.userId))
    .limit(1);

  if (userData.length === 0) {
    return null;
  }

  const userRecord = userData[0];

  return {
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      image: userRecord.image,
    },
    session: {
      id: sess.id,
      expiresAt: sess.expiresAt,
    },
  };
}

/**
 * Delete session (sign out)
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  if (!sessionToken || typeof sessionToken !== "string") {
    return;
  }
  await db.delete(session).where(eq(session.token, sessionToken));
}

/**
 * Generate and store state parameter for CSRF protection
 */
export function generateState(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Validate state parameter (basic format check)
 */
export function validateState(state: string | undefined): boolean {
  if (!state || typeof state !== "string") {
    return false;
  }
  // State should be 32 hex characters (16 bytes)
  return /^[a-f0-9]{32}$/.test(state);
}
