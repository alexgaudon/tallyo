import { cn } from "@/lib/utils";
import { usePrivacyMode } from "../toggle-privacy-mode";

export const displayFormat = (amount: number) => (amount / 100).toFixed(2);

export default function AmountDisplay({
  amount,
  colored,
}: {
  amount: number;
  colored?: boolean;
}) {
  const { isPrivacyMode } = usePrivacyMode();
  let displayAmount = amount;

  if (Number(amount).toString() === "NaN") {
    displayAmount = 0;
  }

  // Format the amount
  const formattedAmount = displayFormat(Math.abs(displayAmount));

  // Generate the placeholder with dots
  const hiddenAmount = "•".repeat(formattedAmount.length);

  return (
    <span
      className={cn(
        {
          "text-red-500": displayAmount <= 0 && colored,
          "text-green-500": displayAmount > 0 && colored,
        },
        "text-nowrap",
      )}
    >
      {displayAmount < 0 ? "-" : ""}$
      {isPrivacyMode ? hiddenAmount : formattedAmount}
    </span>
  );
}
