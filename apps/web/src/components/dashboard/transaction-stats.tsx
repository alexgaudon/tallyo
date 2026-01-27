import { useNavigate } from "@tanstack/react-router";
import { CreditCardIcon } from "lucide-react";
import type { TransactionStatsData } from "../../../../server/src/routers";
import { Card } from "../ui/card";
import { CardListEmpty } from "../ui/card-list";
import { CurrencyAmount } from "../ui/currency-amount";

export function TransactionStats({
  data,
}: {
  data: TransactionStatsData | undefined;
}) {
  const navigate = useNavigate();

  if (!data || data.length === 0) {
    return (
      <CardListEmpty
        icon={<CreditCardIcon className="h-10 w-10 text-muted-foreground" />}
        title="No Transaction Data Available"
        description="Largest transactions will appear here once you have reviewed transactions."
      />
    );
  }

  const handleTransactionClick = () => {
    navigate({
      to: "/transactions",
    });
  };

  return (
    <div className="space-y-1.5">
      {data.map((transaction) => (
        <Card
          key={transaction.id}
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-accent/10">
                <CreditCardIcon className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-xs sm:text-sm">
                  {transaction.transactionDetails}
                </p>
                <p className="text-[0.7rem] sm:text-xs text-muted-foreground">
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
              <CurrencyAmount animate amount={Number(transaction.amount)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
