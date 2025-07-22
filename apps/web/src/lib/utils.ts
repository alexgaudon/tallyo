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
		// For privacy mode, show bullet points instead of actual values
		// Count the number of characters in the value to determine bullet count
		const valueStr = String(value);
		const bulletCount = Math.min(valueStr.length, 10); // Cap at 10 bullets
		return "•".repeat(bulletCount);
	}
	return value;
}
