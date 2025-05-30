import { MerchantForm } from "./merchant-form";

export function CreateMerchantForm({
	callback,
}: {
	callback?: () => void;
}) {
	return <MerchantForm callback={callback} />;
}
