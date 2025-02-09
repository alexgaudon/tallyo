import { z } from "zod";

const baseSchema = z.object({
  DATABASE_URL: z.string().default("file:local.db"),
  DATABASE_TOKEN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URL: z.string().optional(),
});

const prodSchema = baseSchema.extend({
  DATABASE_URL: z.string(),
  DATABASE_TOKEN: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_REDIRECT_URL: z.string(),
});

const schema = process.env.NODE_ENV === "production" ? prodSchema : baseSchema;

export const env = schema.parse(process.env);

declare global {
  interface Window {
    env: typeof env;
  }
}

if (typeof window !== "undefined") {
  window.env = env;
}
