import { useSession } from "@/lib/auth-client";
import { cn, formatCurrency, formatValueWithPrivacy } from "@/lib/utils";
import type { ReactNode } from "react";

interface CurrencyAmountProps {
	/**
	 * Amount in cents (e.g., 1500 for $15.00)
	 */
	amount: number;
	/**
	 * Currency code (defaults to "USD")
	 */
	currency?: string;
	/**
	 * CSS class name for styling
	 */
	className?: string;
	/**
	 * Whether to show negative amounts in red and positive in green
	 */
	showColor?: boolean;
	/**
	 * Custom component to wrap the amount (e.g., for tooltips)
	 */
	as?: ReactNode;
	/**
	 * Override privacy mode setting (useful for testing or specific use cases)
	 */
	forcePrivacyMode?: boolean;
}

/**
 * A reusable component for displaying dollar amounts that respects privacy mode.
 *
 * @example
 * ```tsx
 * <CurrencyAmount amount={1500} /> // Shows "$15.00" or "••••••" in privacy mode
 * <CurrencyAmount amount={-2500} showColor /> // Shows "-$25.00" in red
 * <CurrencyAmount amount={1000} className="text-lg font-bold" />
 * ```
 */
export function CurrencyAmount({
	amount,
	currency = "USD",
	className,
	showColor = false,
	as,
	forcePrivacyMode,
}: CurrencyAmountProps) {
	const { data: session } = useSession();
	const isPrivacyMode =
		forcePrivacyMode ?? session?.settings?.isPrivacyMode ?? false;

	const formattedAmount = formatCurrency(amount, currency);
	const displayValue = formatValueWithPrivacy(formattedAmount, isPrivacyMode);

	const content = (
		<span
			className={cn(
				"font-mono",
				showColor && amount < 0 && "text-red-600",
				showColor && amount > 0 && "text-green-600",
				className,
			)}
		>
			{displayValue}
		</span>
	);

	if (as) {
		return <>{as}</>;
	}

	return content;
}
