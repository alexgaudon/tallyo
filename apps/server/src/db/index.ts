import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(process.env.DATABASE_URL || "");

export async function healthCheck() {
	await db.execute("SELECT 1");
}
