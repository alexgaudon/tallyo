import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema/auth";

const isDevelopment = process.env.NODE_ENV === "development";

console.log("isDevelopment", isDevelopment);

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailAndPassword: {
    enabled: isDevelopment,
  },
  socialProviders: !isDevelopment
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID || "",
          clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
        },
      }
    : undefined,
});
