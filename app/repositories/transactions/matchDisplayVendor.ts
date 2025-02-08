import { db } from "@/server/db";
import { transaction } from "@/server/db/schema";
import { and, eq, like, sql } from "drizzle-orm";
import Fuse from "fuse.js";

async function fuzzyMatchDisplayVendor(userId: string, vendor: string) {
  if (vendor.length < 5) {
    return vendor;
  }

  const prefix = vendor.slice(0, 5);

  const similarVendors = await db
    .select()
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        like(sql`UPPER(${transaction.vendor})`, `${prefix.toUpperCase()}%`)
      )
    );

  if (similarVendors.length === 0) {
    return vendor;
  }

  // Prepare the data for Fuse.js
  const options = {
    includeScore: true,
    keys: ["vendor"], // Adjust this if your vendor field has a different name
  };

  const fuse = new Fuse(similarVendors, options);
  const result = fuse.search(vendor);

  // Check if we found any matches
  if (result.length > 0) {
    return result[0].item.displayVendor; // Return the displayVendor of the most similar match
  }

  return vendor; // Fallback to the original vendor if no match is found
}
export async function matchDisplayVendor(userId: string, vendor: string) {
  const similarVendors = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.vendor, vendor), eq(transaction.userId, userId)));

  if (similarVendors.length === 0) {
    return await fuzzyMatchDisplayVendor(userId, vendor);
  }

  const similarVendor = similarVendors[0];

  return similarVendor.displayVendor ?? vendor;
}
