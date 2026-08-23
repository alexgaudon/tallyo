import type { MerchantWithKeywordsAndCategory } from "../../../server/src/routers";
import {
  findAllMatchingMerchants,
  type MatchableMerchant,
} from "./merchant-matching";

/** Merchants whose name or keywords match the bank/import description. */
export function findMerchantsMatchingDetails(
  merchants: MerchantWithKeywordsAndCategory[],
  transactionDetails?: string | null,
): MerchantWithKeywordsAndCategory[] {
  if (!transactionDetails?.trim()) return [];

  const matches = findAllMatchingMerchants(
    merchants as MatchableMerchant[],
    transactionDetails,
  );

  return matches.map((m) => m.merchant as MerchantWithKeywordsAndCategory);
}
