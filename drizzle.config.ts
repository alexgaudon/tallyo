import type { Config } from "drizzle-kit";

import { safeEnv } from "@/env";

export default {
  out: "./drizzle",
  schema: "./app/server/db/schema.ts",
  breakpoints: true,
  dialect: "turso",
  dbCredentials: {
    url: safeEnv.DATABASE_URL,
    // authToken: safeEnv.DATABASE_TOKEN,
  },
} satisfies Config;
