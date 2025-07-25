import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface StatDisplayProps {
	/**
	 * The final string value to display
	 */
	value: string | number;
	/**
	 * CSS class name for styling
	 */
	className?: string;
	/**
	 * Custom component to wrap the value (e.g., for tooltips)
	 */
	as?: ReactNode;
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
 * A reusable component for displaying animated stat values that "roll up" to the final value.
 *
 * @example
 * ```tsx
 * <StatDisplay value="1,234" animate /> // Animates from 0 to 1,234
 * <StatDisplay value="99%" animate /> // Animates from 0% to 99%
 * <StatDisplay value="Hello" animate /> // Animates through random characters to "Hello"
 * ```
 */
export function StatDisplay({
	value,
	className,
	as,
	animate = false,
	animationDuration = 1000,
}: StatDisplayProps) {
	const [displayValue, setDisplayValue] = useState(animate ? "" : value);
	const [isAnimating, setIsAnimating] = useState(animate);

	useEffect(() => {
		if (!animate) {
			setDisplayValue(value);
			return;
		}

		// Convert value to string for processing
		const valueStr = String(value);

		// Check if value looks like a dollar amount, number, or percentage
		const isDollarAmount = /^\$?[\d,]+(\.\d{2})?$/.test(valueStr);
		const isNumber = /^[\d,]+(\.\d+)?$/.test(valueStr);
		const isPercentage = /^[\d,]+%$/.test(valueStr);

		// Only animate if it's a number, dollar amount, or percentage
		if (!isDollarAmount && !isNumber && !isPercentage) {
			setDisplayValue(value);
			return;
		}

		setIsAnimating(true);
		setDisplayValue("");

		const startTime = Date.now();
		const targetValue = valueStr;

		const animateValue = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / animationDuration, 1);

			// Easing function for smooth animation
			const easeOutQuart = 1 - (1 - progress) ** 16;

			// Extract numeric value for animation
			const numericValue = Number.parseFloat(
				targetValue.replace(/[^\d.-]/g, ""),
			);
			if (!Number.isNaN(numericValue)) {
				const currentNumeric = Math.round(numericValue * easeOutQuart);
				// Preserve formatting (commas, decimals, currency symbol, etc.)
				const formatted = targetValue.replace(
					/[\d.-]+/,
					currentNumeric.toString(),
				);
				setDisplayValue(formatted);
			} else {
				setDisplayValue(targetValue);
			}

			if (progress < 1) {
				requestAnimationFrame(animateValue);
			} else {
				setDisplayValue(targetValue);
				setIsAnimating(false);
			}
		};

		requestAnimationFrame(animateValue);
	}, [value, animate, animationDuration]);

	const content = (
		<span
			className={cn(
				"font-mono",
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
