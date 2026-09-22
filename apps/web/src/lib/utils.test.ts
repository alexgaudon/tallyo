import { describe, expect, it } from "vitest";
import {
  cn,
  dateRangeToApiFormat,
  formatCurrency,
  formatValueWithPrivacy,
} from "@/lib/utils";

describe("cn", () => {
  it("returns an empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("joins truthy class names", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("drops falsy values", () => {
    expect(cn("base", false, undefined, null, "", "end")).toBe("base end");
  });

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("resolves conflicting tailwind classes in favor of the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("formatCurrency", () => {
  it("formats positive cents as USD", () => {
    expect(formatCurrency(123456)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("places the negative sign before the dollar sign", () => {
    expect(formatCurrency(-123456)).toBe("-$1,234.56");
  });

  it("handles small negative amounts", () => {
    expect(formatCurrency(-5)).toBe("-$0.05");
  });

  it("honors an explicit currency code", () => {
    expect(formatCurrency(1000, "EUR")).toBe("€10.00");
  });
});

describe("formatValueWithPrivacy", () => {
  it("returns the original value when privacy mode is off", () => {
    expect(formatValueWithPrivacy("$1,234.56", false)).toBe("$1,234.56");
    expect(formatValueWithPrivacy(42, false)).toBe(42);
  });

  it("masks digits while keeping $, . and , visible", () => {
    expect(formatValueWithPrivacy("$1,234.56", true)).toBe("$•,•••.••");
  });

  it("masks a negative amount", () => {
    expect(formatValueWithPrivacy("-$5.00", true)).toBe("•$•.••");
  });

  it("stringifies numeric input before masking", () => {
    expect(formatValueWithPrivacy(123, true)).toBe("•••");
  });
});

describe("dateRangeToApiFormat", () => {
  it("formats a full range as yyyy-MM-dd", () => {
    expect(
      dateRangeToApiFormat({
        from: new Date(2024, 0, 5),
        to: new Date(2024, 11, 31),
      }),
    ).toEqual({ from: "2024-01-05", to: "2024-12-31" });
  });

  it("handles a from-only range", () => {
    expect(dateRangeToApiFormat({ from: new Date(2024, 5, 15) })).toEqual({
      from: "2024-06-15",
      to: undefined,
    });
  });

  it("handles a to-only range", () => {
    expect(
      dateRangeToApiFormat({ from: undefined, to: new Date(2024, 5, 15) }),
    ).toEqual({
      from: undefined,
      to: "2024-06-15",
    });
  });

  it("returns both undefined for an undefined range", () => {
    expect(dateRangeToApiFormat(undefined)).toEqual({
      from: undefined,
      to: undefined,
    });
  });

  it("pads single-digit months and days", () => {
    expect(dateRangeToApiFormat({ from: new Date(2024, 0, 1) }).from).toBe(
      "2024-01-01",
    );
  });
});
