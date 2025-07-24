import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(Math.abs(amount) / 100);
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
