import { describe, expect, it } from "vitest";
import { currentDecisionDate, decisionItemKey, isDecisionQuadrant, parseDecisionDate } from "./decision-matrix";

describe("decision matrix helpers", () => {
  it("uses the Calendar owner’s Chicago date", () => {
    expect(currentDecisionDate(new Date("2026-11-13T05:30:00.000Z"))).toBe("2026-11-12");
    expect(currentDecisionDate(new Date("2026-11-13T06:30:00.000Z"))).toBe("2026-11-13");
  });

  it("validates dates, quadrants, and stable source keys", () => {
    expect(parseDecisionDate("2026-11-13")?.toISOString().slice(0, 10)).toBe("2026-11-13");
    expect(parseDecisionDate("2026-02-30")).toBeNull();
    expect(isDecisionQuadrant("DO_NOW")).toBe(true);
    expect(isDecisionQuadrant("SOMEDAY")).toBe(false);
    expect(decisionItemKey("PROJECT_TASK", "task-1")).toBe("PROJECT_TASK:task-1");
  });
});
