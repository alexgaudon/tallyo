import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { safeEnv } from "@/env";
import * as schema from "./schema";

const client = createClient({
  url: safeEnv.DATABASE_URL,
});

export const db = drizzle({
  client,
  schema,
});
