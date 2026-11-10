import { describe, expect, it } from "vitest";
import { isCalendarDate, validateHealthCheckIn } from "./lifeos-health";

describe("LifeOS health check-ins", () => {
  it("accepts granular partial sleep data", () => {
    expect(validateHealthCheckIn({ sleep_duration_hours: "7.4", rem_minutes: 92, deep_minutes: 64 })).toEqual({ sleep_duration_hours: 7.4, rem_minutes: 92, deep_minutes: 64 });
  });

  it("rejects empty, unknown-only, and out-of-range data", () => {
    expect(validateHealthCheckIn({})).toBeNull();
    expect(validateHealthCheckIn({ made_up: 10 })).toBeNull();
    expect(validateHealthCheckIn({ sleep_efficiency_pct: 110 })).toBeNull();
  });

  it("validates real calendar dates", () => {
    expect(isCalendarDate("2026-11-10")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
  });
});
