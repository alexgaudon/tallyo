import { useNavigate } from "@tanstack/react-router";
import { StoreIcon } from "lucide-react";
import type {
  DashboardMerchantStats,
  DashboardPeriodComparison,
} from "../../../../server/src/routers";
import { Card } from "../ui/card";
import { CardListEmpty } from "../ui/card-list";
import { CurrencyAmount } from "../ui/currency-amount";

export function MerchantStats({
  data,
  previous,
}: {
  data: DashboardMerchantStats | undefined;
  previous?: DashboardPeriodComparison["merchants"];
}) {
  const navigate = useNavigate();

  const previousTotals = new Map(
    (previous ?? []).map((item) => [item.merchantId, item.totalAmount]),
  );

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
    <div className="space-y-1.5">
      {data.map((merchant) => {
        const current = Math.abs(Number(merchant.totalAmount));
        const prevTotal = previousTotals.get(merchant.merchantId);
        const changePct =
          prevTotal === undefined || prevTotal === 0
            ? null
            : Math.round(((current - prevTotal) / prevTotal) * 100);
        return (
          <Card
            key={merchant.merchantId}
            className="px-3 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleMerchantClick(merchant.merchantId)}
            aria-label={`View transactions for ${merchant.merchantName}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-accent/10">
                  <StoreIcon className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-xs sm:text-sm">
                    {merchant.merchantName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {merchant.count} transaction
                    {merchant.count !== 1 ? "s" : ""}
                    {changePct !== null && (
                      <span
                        className={`ml-1.5 ${
                          changePct > 0
                            ? "text-expense"
                            : changePct < 0
                              ? "text-income"
                              : "text-muted-foreground"
                        }`}
                      >
                        {changePct > 0 ? "▲" : changePct < 0 ? "▼" : "—"}{" "}
                        {Math.abs(changePct)}% vs last period
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <CurrencyAmount animate amount={Number(merchant.totalAmount)} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
