import { describe, expect, it } from "vitest";
import {
  CALENDAR_LEVELS,
  calendarTiles,
  chicagoLocalToUtc,
  floorLocal,
  periodEnd,
  periodLabel,
  shiftPeriod,
  utcToChicagoInput,
} from "./lifeos-time";

describe("LifeOS semantic calendar", () => {
  it("supports the complete Life to Hour hierarchy", () => {
    expect(CALENDAR_LEVELS).toEqual(["LIFE", "PHASE", "YEAR", "QUARTER", "MONTH", "WEEK", "DAY", "HOUR"]);
    const expected = [
      ["LIFE", 8, "PHASE"], ["PHASE", 10, "YEAR"], ["YEAR", 4, "QUARTER"],
      ["QUARTER", 3, "MONTH"], ["MONTH", 6, "WEEK"], ["WEEK", 7, "DAY"],
      ["DAY", 24, "HOUR"], ["HOUR", 4, null],
    ] as const;
    for (const [level, count, next] of expected) {
      const start = floorLocal("2026-11-10T14:30", level);
      const tiles = calendarTiles(level, start);
      expect(tiles).toHaveLength(count);
      expect(tiles.every((tile) => tile.nextLevel === next)).toBe(true);
      expect(tiles.every((tile) => tile.start < tile.end)).toBe(true);
    }
  });

  it("uses calendar-aware boundaries and adjacent navigation", () => {
    expect(floorLocal("2026-11-10T14:30", "QUARTER")).toBe("2026-10-01T00:00");
    expect(floorLocal("2026-11-10T14:30", "WEEK")).toBe("2026-11-09T00:00");
    expect(periodEnd("MONTH", "2026-02-01T00:00")).toBe("2026-03-01T00:00");
    expect(shiftPeriod("QUARTER", "2026-10-01T00:00", 1)).toBe("2027-01-01T00:00");
    expect(periodLabel("DAY", "2026-11-10T00:00")).toContain("November 10, 2026");
  });

  it("round-trips precise instants in America/Chicago across DST", () => {
    expect(chicagoLocalToUtc("2026-01-15T09:30")).toBe("2026-01-15T15:30:00.000Z");
    expect(chicagoLocalToUtc("2026-07-15T09:30")).toBe("2026-07-15T14:30:00.000Z");
    expect(utcToChicagoInput("2026-07-15T14:30:00.000Z")).toBe("2026-07-15T09:30");
    expect(chicagoLocalToUtc("2026-03-08T02:30")).toBeNull();
  });
});
