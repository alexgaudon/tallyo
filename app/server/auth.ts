import { betterAuth, Session, User } from "better-auth";
import { db } from "./db";

import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "@/env";

export type Auth =
  | { isAuthenticated: false; user: null; session: null }
  | { isAuthenticated: true; user: User; session: Session };

const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {};

if (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
  socialProviders.discord = {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
  };
} else {
  console.log("No social providers configured");
}

export const auth = betterAuth({
  trustedOrigins: ["https://tallyo.app", "https://tallyo.app/signin"],
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: import.meta.env.PROD !== true,
  },
  socialProviders,
});
