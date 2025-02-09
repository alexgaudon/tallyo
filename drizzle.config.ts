import type { Config } from "drizzle-kit";

import { env } from "@/env";

export default {
  out: "./drizzle",
  schema: "./app/server/db/schema.ts",
  breakpoints: true,
  dialect: "turso",
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_TOKEN,
  },
} satisfies Config;
