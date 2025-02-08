import { type ClassValue, clsx } from "clsx";
import { addDays } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBestTextColor(hexColor: string): "black" | "white" {
  // Convert hex color to RGB
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate the relative luminance (brightness) of the color
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  // Determine the best text color based on luminance
  return luminance > 0.5 ? "black" : "white";
}

export function getRandomColor() {
  return Math.floor(Math.random() * 16777215).toString(16);
}

export function generateRandomPalette(paletteSize: number): string[] {
  const palette: string[] = [];

  const randomHue = Math.random() * 360; // Random starting point for hue

  for (let i = 0; i < paletteSize; i++) {
    const hue = (randomHue + i * 30) % 360; // Vary hue every 30 degrees
    const saturation = 70 + Math.random() * 20; // Vary saturation for diversity
    const lightness = 50 + Math.random() * 20; // Vary lightness for diversity

    const color = hslToHex(hue, saturation, lightness);
    palette.push(color);
  }

  return palette;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = (hue / 360) * 6;
  const s = saturation / 100;
  const l = lightness / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 1) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 1 && h < 2) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 2 && h < 3) {
    [r, g, b] = [0, c, x];
  } else if (h >= 3 && h < 4) {
    [r, g, b] = [0, x, c];
  } else if (h >= 4 && h < 5) {
    [r, g, b] = [x, 0, c];
  } else if (h >= 5 && h < 6) {
    [r, g, b] = [c, 0, x];
  }

  const m = l - c / 2;
  const [red, green, blue] = [(r + m) * 255, (g + m) * 255, (b + m) * 255];

  return `#${Math.round(red).toString(16).padStart(2, "0")}${Math.round(green)
    .toString(16)
    .padStart(2, "0")}${Math.round(blue).toString(16).padStart(2, "0")}`;
}

type TransformDate<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K];
};

export function transform<T extends Record<string, any>>(
  data: T,
): TransformDate<T> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value instanceof Date ? value.toString() : value,
    ]),
  ) as TransformDate<T>;
}

export function transformAmounts<T extends Record<string, any>>(data: T) {
  const returnValue: {
    [t: string]: any;
  } = { ...data };

  if ("amount" in data) {
    returnValue.amount = getDisplayAmount(Math.abs(data["amount"]));
  }

  if ("income" in data) {
    returnValue.income = getDisplayAmount(Math.abs(data["income"]));
  }

  if ("expenses" in data) {
    returnValue.expenses = getDisplayAmount(Math.abs(data["expenses"]));
  }

  return returnValue;
}

export function getPeriodFromDate(date: Date) {
  return date.toISOString().substring(0, 7);
}

export function getDisplayAmount(amount: number) {
  return (amount / 100).toFixed(2);
}

const dollar = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(amount: number) {
  return dollar.format(amount);
}

export function getRealMonth(date: Date): string {
  date = addDays(date, 2);
  return date.toLocaleString("default", {
    month: "long",
  });
}

export function displayFormatMonth(date: Date): string {
  date = addDays(date, 2);
  return date.toLocaleString("default", {
    month: "long",
    year: "2-digit",
  });
}

export function formatDateISO8601(date: Date): string {
  return date.toISOString().split("T")[0];
}

export const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === "string") {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split("-").map((part) => parseInt(part, 10));
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date;
  } else {
    // If dateInput is already a Date object, return it directly
    return dateInput;
  }
};

export const getDateAdjustedForTimezoneAsString = (
  dateInput: Date | string,
): string => {
  if (typeof dateInput === "string") {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split("-").map((part) => parseInt(part, 10));
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return formatDateISO8601(date);
  } else {
    // If dateInput is already a Date object, return it directly
    return formatDateISO8601(dateInput);
  }
};
