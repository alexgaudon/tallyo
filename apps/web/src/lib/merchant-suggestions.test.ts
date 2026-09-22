import { describe, expect, it } from "vitest";
import { findMerchantsMatchingDetails } from "@/lib/merchant-suggestions";
import type { MerchantWithKeywordsAndCategory } from "../../../server/src/routers";

function merchant(
  id: string,
  name: string,
  keywords: string[] = [],
): MerchantWithKeywordsAndCategory {
  return {
    id,
    name,
    keywords: keywords.map((keyword) => ({ keyword })),
    recommendedCategoryId: null,
  } as unknown as MerchantWithKeywordsAndCategory;
}

describe("findMerchantsMatchingDetails", () => {
  it("matches case-insensitively on the merchant name", () => {
    const spotify = merchant("m1", "Spotify");

    expect(
      findMerchantsMatchingDetails([spotify], "SPOTIFY P9R09WWR0"),
    ).toEqual([spotify]);
  });

  it("matches a substring bounded by punctuation", () => {
    const netflix = merchant("m1", "Netflix");

    expect(findMerchantsMatchingDetails([netflix], "NETFLIX.COM")).toEqual([
      netflix,
    ]);
  });

  it("matches a partial-word occurrence for longer names", () => {
    const spotify = merchant("m1", "Spotify");

    expect(findMerchantsMatchingDetails([spotify], "SPOTIFY123")).toEqual([
      spotify,
    ]);
  });

  it("matches on a keyword when the name does not match", () => {
    const streaming = merchant("m1", "Streaming Service", ["netflix"]);

    expect(findMerchantsMatchingDetails([streaming], "NETFLIX.COM")).toEqual([
      streaming,
    ]);
  });

  it("matches by name even when the merchant has no keywords", () => {
    const bare = merchant("m1", "Spotify", []);

    expect(findMerchantsMatchingDetails([bare], "spotify premium")).toEqual([
      bare,
    ]);
  });

  it("returns all matches sorted by relevance, highest score first", () => {
    const starbucks = merchant("m1", "Starbucks");
    const coffee = merchant("m2", "Coffee");

    expect(
      findMerchantsMatchingDetails([coffee, starbucks], "STARBUCKS COFFEE"),
    ).toEqual([starbucks, coffee]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(
      findMerchantsMatchingDetails([merchant("m1", "Netflix")], "grocery run"),
    ).toEqual([]);
  });

  it("returns an empty array for an empty merchant list", () => {
    expect(findMerchantsMatchingDetails([], "spotify")).toEqual([]);
  });

  it("ignores needles shorter than the loose-match threshold", () => {
    expect(
      findMerchantsMatchingDetails(
        [merchant("m1", "Acme", ["the"])],
        "the corner shop",
      ),
    ).toEqual([]);
  });

  it("returns an empty array for missing or blank details", () => {
    const spotify = merchant("m1", "Spotify");

    expect(findMerchantsMatchingDetails([spotify], undefined)).toEqual([]);
    expect(findMerchantsMatchingDetails([spotify], null)).toEqual([]);
    expect(findMerchantsMatchingDetails([spotify], "")).toEqual([]);
    expect(findMerchantsMatchingDetails([spotify], "   ")).toEqual([]);
  });

  it("tolerates surrounding whitespace in the details", () => {
    const spotify = merchant("m1", "Spotify");

    expect(findMerchantsMatchingDetails([spotify], "  SPOTIFY  ")).toEqual([
      spotify,
    ]);
  });

  it("returns the original merchant objects by reference", () => {
    const spotify = merchant("m1", "Spotify");
    const result = findMerchantsMatchingDetails([spotify], "spotify");

    expect(result[0]).toBe(spotify);
  });
});
