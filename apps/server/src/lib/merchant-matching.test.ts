import { describe, expect, it } from "vitest";
import {
  findAllMatchingMerchants,
  findBestMatchingMerchant,
  type MatchableMerchant,
  scoreMerchantMatch,
} from "@/lib/merchant-matching";

const spotify: MatchableMerchant = {
  id: "spotify",
  name: "Spotify",
  keywords: [{ keyword: "SPOTIFY PREMIUM" }],
};
const amazon: MatchableMerchant = {
  id: "amazon",
  name: "Amazon",
  keywords: [{ keyword: "AMZN" }],
};

describe("scoreMerchantMatch", () => {
  it("matches the merchant name case-insensitively at a word boundary", () => {
    expect(scoreMerchantMatch(spotify, "SPOTIFY PREMIUM SUBSCRIPTION")).toBe(
      57,
    );
  });

  it("gives an exact name match the highest score (base + length)", () => {
    expect(scoreMerchantMatch(spotify, "spotify")).toBe(107);
  });

  it("matches an explicit keyword", () => {
    const merchant: MatchableMerchant = {
      id: "netflix",
      name: "Nope",
      keywords: [{ keyword: "netflix" }],
    };
    expect(scoreMerchantMatch(merchant, "NETFLIX.COM 12345")).toBe(47);
    expect(scoreMerchantMatch(merchant, "netflix")).toBe(97);
  });

  it("prefers the name match over an equal-length keyword match", () => {
    const merchant: MatchableMerchant = {
      id: "amazon",
      name: "Amazon",
      keywords: [{ keyword: "amazon" }],
    };
    expect(scoreMerchantMatch(merchant, "amazon")).toBe(106);
  });

  it("allows partial-word matches only for needles of length 5+", () => {
    expect(scoreMerchantMatch(spotify, "spotify123")).toBe(47);
  });

  it("returns 0 for no match", () => {
    expect(scoreMerchantMatch(spotify, "grocery market")).toBe(0);
  });

  it("returns 0 for an empty or whitespace-only description", () => {
    expect(scoreMerchantMatch(spotify, "")).toBe(0);
    expect(scoreMerchantMatch(spotify, "   ")).toBe(0);
  });

  it("returns 0 for needles shorter than the loose-match minimum", () => {
    const merchant: MatchableMerchant = {
      id: "the",
      name: "The",
      keywords: [],
    };
    expect(scoreMerchantMatch(merchant, "the store")).toBe(0);
  });

  it("still matches on name when the keyword list is empty", () => {
    const merchant: MatchableMerchant = { id: "acme", name: "Acme" };
    expect(scoreMerchantMatch(merchant, "acme corp")).toBe(54);
  });

  it("ignores empty keyword entries", () => {
    const merchant: MatchableMerchant = {
      id: "acme",
      name: "Acme",
      keywords: [{ keyword: "" }, { keyword: "  " }],
    };
    expect(scoreMerchantMatch(merchant, "acme corp")).toBe(54);
  });
});

describe("findBestMatchingMerchant", () => {
  it("returns the single highest-scoring candidate", () => {
    expect(
      findBestMatchingMerchant([spotify, amazon], "AMAZON PRIME")?.id,
    ).toBe("amazon");
  });

  it("returns null when nothing matches", () => {
    expect(
      findBestMatchingMerchant([spotify, amazon], "random merchant"),
    ).toBeNull();
  });

  it("returns null for missing or blank details", () => {
    expect(findBestMatchingMerchant([spotify], null)).toBeNull();
    expect(findBestMatchingMerchant([spotify], undefined)).toBeNull();
    expect(findBestMatchingMerchant([spotify], "   ")).toBeNull();
  });

  it("returns null for an empty merchant list", () => {
    expect(findBestMatchingMerchant([], "amazon")).toBeNull();
  });
});

describe("findAllMatchingMerchants", () => {
  it("returns every match sorted by score descending", () => {
    const matches = findAllMatchingMerchants(
      [spotify, amazon],
      "spotify and amazon",
    );
    expect(matches.map((m) => m.merchant.id)).toEqual(["spotify", "amazon"]);
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
  });

  it("excludes non-matching merchants", () => {
    const matches = findAllMatchingMerchants([spotify, amazon], "spotify only");
    expect(matches.map((m) => m.merchant.id)).toEqual(["spotify"]);
  });

  it("returns an empty array for blank details", () => {
    expect(findAllMatchingMerchants([spotify], "")).toEqual([]);
    expect(findAllMatchingMerchants([spotify], null)).toEqual([]);
  });

  it("returns an empty array for an empty merchant list", () => {
    expect(findAllMatchingMerchants([], "amazon")).toEqual([]);
  });
});
