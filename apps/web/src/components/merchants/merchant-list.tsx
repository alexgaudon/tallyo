import { StoreIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { MerchantCard } from "./merchant-card";

interface MerchantListProps {
  merchants: MerchantWithKeywordsAndCategory[];
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
      <EmptyState
        icon={<StoreIcon className="h-12 w-12 text-muted-foreground" />}
        title="No merchants yet"
        description="Add your first merchant to get started"
        bordered={false}
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
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
