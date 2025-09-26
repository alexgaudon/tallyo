import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { cn, formatCurrency, formatValueWithPrivacy } from "@/lib/utils";

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
	/**
	 * Whether to animate the value on first render
	 */
	animate?: boolean;
	/**
	 * Duration of the animation in milliseconds
	 */
	animationDuration?: number;
}

/**
 * A reusable component for displaying dollar amounts that respects privacy mode.
 *
 * @example
 * ```tsx
 * <CurrencyAmount amount={1500} /> // Shows "$15.00" or "••••••" in privacy mode
 * <CurrencyAmount amount={-2500} showColor /> // Shows "-$25.00" in red
 * <CurrencyAmount amount={1000} className="text-lg font-bold" />
 * <CurrencyAmount amount={1000} animate /> // Animates from 0 to $10.00
 * ```
 */
export function CurrencyAmount({
	amount,
	currency = "USD",
	className,
	showColor = false,
	as,
	forcePrivacyMode,
	animate = false,
	animationDuration = 1000,
}: CurrencyAmountProps) {
	const { data: session } = useSession();
	const isPrivacyMode =
		forcePrivacyMode ?? session?.settings?.isPrivacyMode ?? false;

	const [animatedAmount, setAnimatedAmount] = useState(amount);
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		if (!animate) {
			setAnimatedAmount(amount);
			return;
		}

		// Only animate when the amount changes, not on first render
		const prevAmount = animatedAmount;
		if (prevAmount === amount) {
			return;
		}

		setIsAnimating(true);

		const startTime = Date.now();
		const startAmount = prevAmount;
		const targetAmount = amount;
		const difference = targetAmount - startAmount;

		const animateValue = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / animationDuration, 1);

			// Easing function for smooth animation
			const easeOutQuart = 1 - (1 - progress) ** 64;
			const currentAmount = Math.round(startAmount + difference * easeOutQuart);

			setAnimatedAmount(currentAmount);

			if (progress < 1) {
				requestAnimationFrame(animateValue);
			} else {
				setIsAnimating(false);
			}
		};

		requestAnimationFrame(animateValue);
	}, [amount, animate, animationDuration, animatedAmount]);

	const formattedAmount = formatCurrency(animatedAmount, currency);
	const displayValue = formatValueWithPrivacy(formattedAmount, isPrivacyMode);

	const content = (
		<span
			className={cn(
				"font-mono",
				"flex items-center",
				showColor && animatedAmount < 0 && "text-red-600",
				showColor && animatedAmount > 0 && "text-green-600",
				isAnimating && "transition-all duration-75 ease-out",
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
