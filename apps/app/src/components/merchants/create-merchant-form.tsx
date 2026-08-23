import { MerchantForm } from "./merchant-form";

export function CreateMerchantForm({
  callback,
}: {
  callback?: (merchantId?: string) => void;
}) {
  return <MerchantForm callback={callback} />;
}
