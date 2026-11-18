import { describe, expect, it } from "vitest";
import { BUILT_IN_PILLAR_RESOURCES, PILLAR_RESOURCE_CATEGORIES, safeResourceUrl } from "./pillar-resources";

describe("pillar resources", () => {
  it("provides starter resources and dedicated categories for every pillar", () => {
    expect(new Set(BUILT_IN_PILLAR_RESOURCES.map((resource) => resource.pillarKey))).toEqual(new Set(["HEALTH", "WEALTH", "RELATIONSHIPS"]));
    expect(PILLAR_RESOURCE_CATEGORIES.HEALTH).toContain("Nutrition");
    expect(PILLAR_RESOURCE_CATEGORIES.WEALTH).toContain("Investing");
    expect(PILLAR_RESOURCE_CATEGORIES.RELATIONSHIPS).toContain("Communication");
  });

  it("accepts only web links and permits an empty link for saved notes", () => {
    expect(safeResourceUrl("https://example.com/path")).toBe("https://example.com/path");
    expect(safeResourceUrl("")).toBe("");
    expect(safeResourceUrl("javascript:alert(1)")).toBeNull();
  });
});
