import { useNavigate } from "@tanstack/react-router";
import { CreditCardIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionStatsData } from "../../../../server/src/routers";
import { CurrencyAmount } from "../ui/currency-amount";

export function TransactionStats({
  data,
}: {
  data: TransactionStatsData | undefined;
}) {
  const navigate = useNavigate();

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <CreditCardIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          No Transaction Data Available
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Largest transactions will appear here once you have reviewed
          transactions.
        </p>
      </div>
    );
  }

  const handleTransactionClick = () => {
    navigate({
      to: "/transactions",
    });
  };

  return (
    <div className="space-y-0 border rounded-lg overflow-hidden flex flex-col">
      {data.map((transaction, index) => (
        <button
          key={transaction.id}
          type="button"
          className={cn(
            "bg-card flex items-center justify-between p-3 hover:bg-muted/50 transition-colors flex-1 cursor-pointer w-full text-left",
            {
              "border-b": index !== data.length - 1,
            },
          )}
          onClick={() => {
            handleTransactionClick();
            navigate({
              to: "/transactions",
              search: {
                filter: transaction.transactionDetails,
              },
            });
          }}
          aria-label={`View transaction ${transaction.transactionDetails}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
              <CreditCardIcon className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {transaction.transactionDetails}
              </p>
              <p className="text-xs text-muted-foreground">
                {`${
                  transaction.merchantName
                    ? transaction.merchantName
                    : "Unknown Merchant"
                } • `}
                {transaction.date
                  ? new Date(transaction.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Unknown Date"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">
              <CurrencyAmount animate amount={Number(transaction.amount)} />
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
