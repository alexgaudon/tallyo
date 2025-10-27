import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
	const isNegative = amount < 0;
	const absoluteAmount = Math.abs(amount);

	const formatted = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(absoluteAmount / 100);

	// If negative, move the dollar sign after the negative sign
	if (isNegative) {
		return formatted.replace("$", "-$");
	}

	return formatted;
}

export function formatValueWithPrivacy(
	value: string | number,
	isPrivacyMode: boolean,
) {
	if (isPrivacyMode) {
		// Show dollar signs, periods, and commas as their true values; mask all other characters
		const valueStr = String(value);
		let masked = "";
		for (const char of valueStr) {
			if (char === "$" || char === "." || char === ",") {
				masked += char;
			} else {
				masked += "•";
			}
		}
		return masked;
	}
	return value;
}

// Helper function to convert DateRange to API format
export function dateRangeToApiFormat(dateRange: DateRange | undefined) {
	return {
		from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
		to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
	};
}

export function isDateRangeOneMonth(dateRange: DateRange | undefined) {
	if (!dateRange?.from || !dateRange?.to) return false;
	const diffInDays = Math.abs(
		(dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24),
	);
	return diffInDays < 30;
}
