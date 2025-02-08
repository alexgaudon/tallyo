import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  DATABASE_TOKEN: z.string().optional(),
  VITE_APP_NAME: z.string(),
  VITE_APP_TITLE: z.string(),
});

export const safeEnv = envSchema.parse(process.env);
