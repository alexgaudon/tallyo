import type { MatchableMerchant } from "../../../server/src/lib/merchant-matching";
import { findAllMatchingMerchants } from "../../../server/src/lib/merchant-matching";
import type { MerchantWithKeywordsAndCategory } from "../../../server/src/routers";

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
