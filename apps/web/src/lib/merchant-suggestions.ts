import type { MerchantWithKeywordsAndCategory } from "../../../server/src/routers";

/** Merchants whose keywords match the bank/import description. */
export function findMerchantsMatchingDetails(
  merchants: MerchantWithKeywordsAndCategory[],
  transactionDetails?: string | null,
): MerchantWithKeywordsAndCategory[] {
  if (!transactionDetails?.trim()) return [];

  const details = transactionDetails.toLowerCase().trim();

  return merchants.filter((m) =>
    m.keywords?.some((k) => {
      const kw = k.keyword.toLowerCase().trim();
      return kw.length > 0 && (details.includes(kw) || kw === details);
    }),
  );
}
