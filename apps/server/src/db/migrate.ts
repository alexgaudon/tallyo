import "dotenv/config";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Cannot run migrations.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

async function run() {
  const migrationsFolder = join(import.meta.dirname, "migrations");
  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied.");
}

try {
  await run();
} finally {
  await pool.end();
}
