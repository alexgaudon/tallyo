import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:local.db"),
  DATABASE_TOKEN: z.string().optional(),
  VITE_APP_NAME: z.string().default("Tallyo"),
  VITE_APP_TITLE: z.string().default("Personal Finance"),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_REDIRECT_URL: z.string(),
});

export const safeEnv = envSchema.parse(process.env);
