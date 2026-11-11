import { describe, expect, it } from "vitest";
import { REPORT_CATALOG, REPORT_KEYS, reportDefinition } from "@/lib/lifeos-reports";

describe("Insights report catalog", () => {
  it("offers distinct reports across life, work, strategy, and finances", () => {
    expect(new Set(REPORT_KEYS).size).toBe(REPORT_KEYS.length);
    expect(REPORT_KEYS).toContain("FINANCE");
    expect(REPORT_KEYS).toContain("PROJECTS");
    expect(REPORT_KEYS).toContain("CLIENTS");
    expect(REPORT_KEYS).toContain("HEALTH");
    expect(REPORT_KEYS).toContain("WEALTH");
    expect(REPORT_KEYS).toContain("RELATIONSHIPS");
    expect(REPORT_KEYS).toContain("OMNIS");
    expect(REPORT_CATALOG).toHaveLength(13);
  });

  it("keeps every report understandable before generation", () => {
    for (const report of REPORT_CATALOG) {
      expect(report.title.length).toBeGreaterThan(3);
      expect(report.description.length).toBeGreaterThan(20);
      expect(reportDefinition(report.key)).toBe(report);
    }
  });
});
