import { useQuery } from "@tanstack/react-query";
import { EditIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { orpc } from "@/utils/orpc";
import type { MerchantWithKeywordsAndCategory } from "../../../../server/src/routers";
import { EntitySelect } from "../ui/entity-select";
import { CreateMerchantDialog } from "./create-merchant-dialog";

interface MerchantSelectProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  allowNull?: boolean;
  disabled?: boolean;
  transactionDetails?: string;
  // New props for action buttons
  showActionButtons?: boolean;
  onEditMerchant?: (merchantId: string) => void;
}

export function MerchantSelect({
  value,
  onValueChange,
  placeholder = "Select a merchant",
  className,
  allowNull = false,
  disabled = false,
  transactionDetails,
  // New props for action buttons
  showActionButtons = false,
  onEditMerchant,
}: MerchantSelectProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data } = useQuery(orpc.merchants.getUserMerchants.queryOptions());

  const merchants: MerchantWithKeywordsAndCategory[] = data ?? [];
  const entities = merchants.map(({ id, name }) => ({ id, name }));

  const formatEntityWithDetails = (entity: { id: string; name: string }) => (
    <div className="flex flex-col">
      <span className="font-medium">{entity.name}</span>
    </div>
  );

  const handleCreateSuccess = (merchantId: string) => {
    // Automatically select the newly created merchant
    onValueChange(merchantId);
  };

  // Build action buttons
  const actionButtons = [];

  // Create New Merchant button
  actionButtons.push({
    label: "Create New Merchant",
    icon: <PlusIcon />,
    onClick: () => setCreateDialogOpen(true),
    variant: "outline" as const,
  });

  // Edit Merchant button (only show if a merchant is selected)
  if (value && onEditMerchant) {
    actionButtons.push({
      label: "Edit Merchant",
      icon: <EditIcon />,
      onClick: () => onEditMerchant(value),
      variant: "outline" as const,
    });
  }

  // Clear Merchant button (only show if a merchant is selected and allowNull is true)
  if (value && allowNull) {
    actionButtons.push({
      label: "Clear Merchant",
      icon: <XIcon />,
      onClick: () => onValueChange(null),
      variant: "outline" as const,
    });
  }

  return (
    <>
      <EntitySelect
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        className={className}
        entities={entities}
        formatEntity={transactionDetails ? formatEntityWithDetails : undefined}
        emptyLabel="No merchants available"
        disabled={disabled}
        showActionButtons={showActionButtons || actionButtons.length > 0}
        actionButtons={actionButtons}
      />
      <CreateMerchantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
        initialKeyword={transactionDetails}
      />
    </>
  );
}
