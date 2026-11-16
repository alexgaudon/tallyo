import { describe, expect, it } from "vite-plus/test";
import { getPayCycle, parseDateOnly, toDateOnly } from "@/lib/pay-cycle";

/** Build a local date, the same way the helper does. */
const localDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

describe("parseDateOnly", () => {
  it("parses a date string as local midnight", () => {
    const date = parseDateOnly("2026-11-13");
    expect(date).toEqual(localDate(2026, 11, 13));
    expect(date?.getHours()).toBe(0);
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("2026-02-31")).toBeNull();
    expect(parseDateOnly("not-a-date")).toBeNull();
    expect(parseDateOnly("")).toBeNull();
  });

  it("round-trips through toDateOnly", () => {
    expect(toDateOnly(localDate(2026, 11, 13))).toBe("2026-11-13");
  });
});

describe("getPayCycle", () => {
  it("returns null for an invalid anchor", () => {
    expect(getPayCycle("nope", localDate(2026, 11, 16))).toBeNull();
  });

  it("finds the next pay day when the anchor is in the past", () => {
    const cycle = getPayCycle("2026-11-13", localDate(2026, 11, 16));
    expect(cycle?.date).toEqual(localDate(2026, 11, 27));
    expect(cycle?.daysUntil).toBe(11);
    expect(cycle?.countdown).toBe("in 11 days");
    expect(cycle?.periodStart).toEqual(localDate(2026, 11, 13));
    expect(cycle?.periodEnd).toEqual(localDate(2026, 11, 26));
  });

  it("treats the anchor day itself as pay day", () => {
    const cycle = getPayCycle("2026-11-13", localDate(2026, 11, 13));
    expect(cycle?.date).toEqual(localDate(2026, 11, 13));
    expect(cycle?.daysUntil).toBe(0);
    expect(cycle?.countdown).toBe("Today");
    expect(cycle?.periodStart).toEqual(localDate(2026, 10, 30));
  });

  it("uses the anchor as-is when it is in the future", () => {
    const cycle = getPayCycle("2026-12-04", localDate(2026, 11, 16));
    expect(cycle?.date).toEqual(localDate(2026, 12, 4));
    expect(cycle?.daysUntil).toBe(18);
  });

  it("labels the day before pay day as tomorrow", () => {
    const cycle = getPayCycle("2026-11-13", localDate(2026, 11, 26));
    expect(cycle?.countdown).toBe("Tomorrow");
    expect(cycle?.daysUntil).toBe(1);
  });

  it("rolls forward across many cycles", () => {
    const cycle = getPayCycle("2025-01-03", localDate(2026, 11, 16));
    expect(cycle?.date).toEqual(localDate(2026, 11, 20));
    expect(cycle?.daysUntil).toBe(4);
  });

  it("stays on the 14-day grid across a DST change", () => {
    // US DST begins on 2026-03-08; the anchor and each result stay paydays.
    const cycle = getPayCycle("2026-03-01", localDate(2026, 3, 10));
    expect(cycle?.date).toEqual(localDate(2026, 3, 15));
    expect(cycle?.daysUntil).toBe(5);
  });

  it("keeps the cycle length at 14 days including leap days", () => {
    const cycle = getPayCycle("2024-02-14", localDate(2024, 2, 20));
    expect(cycle?.date).toEqual(localDate(2024, 2, 28));
    expect(cycle?.periodStart).toEqual(localDate(2024, 2, 14));
  });
});
