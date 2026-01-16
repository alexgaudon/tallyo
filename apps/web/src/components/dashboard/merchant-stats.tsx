import { useNavigate } from "@tanstack/react-router";
import { StoreIcon } from "lucide-react";
import type { DashboardMerchantStats } from "../../../../server/src/routers";
import { Card } from "../ui/card";
import { CardListEmpty } from "../ui/card-list";
import { CurrencyAmount } from "../ui/currency-amount";

export function MerchantStats({
  data,
}: {
  data: DashboardMerchantStats | undefined;
}) {
  const navigate = useNavigate();

  if (!data || data.length === 0) {
    return (
      <CardListEmpty
        icon={<span className="text-4xl">🏪</span>}
        title="No Merchant Data Available"
        description="Merchant breakdown will appear here once you have transactions with merchants."
      />
    );
  }

  const handleMerchantClick = (merchantId: string) => {
    navigate({
      to: "/transactions",
      search: { merchant: merchantId, page: 1 },
    });
  };

  return (
    <div className="space-y-2">
      {data.map((merchant) => (
        <Card
          key={merchant.merchantId}
          className="p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => handleMerchantClick(merchant.merchantId)}
          aria-label={`View transactions for ${merchant.merchantName}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <StoreIcon className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm">{merchant.merchantName}</p>
                <p className="text-sm text-muted-foreground">
                  {merchant.count} transaction{merchant.count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <CurrencyAmount animate amount={Number(merchant.totalAmount)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
