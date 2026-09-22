import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/orpc", () => ({ orpc: {} }));

import { formatCategoryText } from "@/components/categories/category-select";

describe("formatCategoryText", () => {
  it("returns the name when there is no parent", () => {
    expect(formatCategoryText({ name: "Groceries" })).toBe("Groceries");
  });

  it("returns the name when parentCategory is null", () => {
    expect(
      formatCategoryText({ name: "Groceries", parentCategory: null }),
    ).toBe("Groceries");
  });

  it("joins parent and child with an arrow", () => {
    expect(
      formatCategoryText({
        name: "Groceries",
        parentCategory: { name: "Food" },
      }),
    ).toBe("Food → Groceries");
  });
});
