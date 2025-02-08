import { betterAuth, Session, User } from "better-auth";
import { db } from "./db";

import { drizzleAdapter } from "better-auth/adapters/drizzle";

export type Auth =
  | { isAuthenticated: false; user: null; session: null }
  | { isAuthenticated: true; user: User; session: Session };

export const auth = betterAuth({
  trustedOrigins: ["https://tallyo.app", "https://tallyo.app/signin"],
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
});
