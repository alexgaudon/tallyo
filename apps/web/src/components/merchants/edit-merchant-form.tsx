import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { MerchantForm } from "./merchant-form";

export function EditMerchantForm({
  merchant,
  callback,
}: {
  merchant: MerchantWithKeywordsAndCategory;
  callback?: () => void;
}) {
  return <MerchantForm merchant={merchant} callback={callback} />;
}
