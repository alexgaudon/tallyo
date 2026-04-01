import { useNavigate } from "@tanstack/react-router";
import { CreditCardIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TransactionStatsData } from "../../../../server/src/routers";
import { Card } from "../ui/card";
import { CardListEmpty } from "../ui/card-list";
import { CurrencyAmount } from "../ui/currency-amount";

const formatRelativeTime = (dateValue: string | Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transactionDate = new Date(dateValue);
  transactionDate.setHours(0, 0, 0, 0);

  const daysDifference = Math.floor(
    (today.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDifference === 0) {
    return "Today";
  } else if (daysDifference === 1) {
    return "Yesterday";
  } else if (daysDifference > 1 && daysDifference < 30) {
    return `${daysDifference} days ago`;
  } else if (daysDifference >= 30 && daysDifference < 365) {
    const months = Math.floor(daysDifference / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else if (daysDifference >= 365) {
    const years = Math.floor(daysDifference / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  } else if (daysDifference === -1) {
    return "Tomorrow";
  } else if (daysDifference < -1 && daysDifference > -30) {
    return `In ${Math.abs(daysDifference)} days`;
  } else if (daysDifference <= -30 && daysDifference > -365) {
    const months = Math.floor(Math.abs(daysDifference) / 30);
    return `In ${months} ${months === 1 ? "month" : "months"}`;
  } else {
    const years = Math.floor(Math.abs(daysDifference) / 365);
    return `In ${years} ${years === 1 ? "year" : "years"}`;
  }
};

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
                  {transaction.date ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {new Date(transaction.date).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatRelativeTime(transaction.date)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    "Unknown Date"
                  )}
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
