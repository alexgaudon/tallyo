import { Card, CardContent } from "@/components/ui/card";
import { StoreIcon } from "lucide-react";
import { MerchantCard } from "./merchant-card";

interface MerchantListProps {
	merchants: MerchantWithKeywords[];
	isLoading: boolean;
	onDelete: (id: string) => Promise<void>;
}

export function MerchantList({
	merchants,
	isLoading,
	onDelete,
}: MerchantListProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-muted-foreground">Loading merchants...</div>
			</div>
		);
	}

	if (!merchants.length) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center p-8 text-center">
					<StoreIcon className="mb-2 h-12 w-12 text-muted-foreground" />
					<h3 className="mb-1 text-lg font-semibold">No merchants yet</h3>
					<p className="text-sm text-muted-foreground">
						Add your first merchant to get started
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{merchants.map((merchant) => (
				<MerchantCard
					key={merchant.id}
					merchant={merchant}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
