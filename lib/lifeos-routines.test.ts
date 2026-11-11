import { describe, expect, it } from "vitest";
import { routineOccurrences, type ScheduledRoutine } from "@/lib/lifeos-routines";

function routine(overrides: Partial<ScheduledRoutine> = {}): ScheduledRoutine {
  return {
    id: "routine-1",
    title: "Upper body and run",
    domainKey: "HEALTH",
    cadence: "WEEKLY",
    active: true,
    notes: "30 minute run",
    scheduleTime: "07:00",
    scheduleDurationMinutes: 60,
    scheduleWeekdays: [1],
    scheduleDayOfMonth: null,
    scheduleStartsOn: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("routine calendar occurrences", () => {
  it("projects a weekly routine only on its selected weekday in Chicago time", () => {
    const occurrences = routineOccurrences(
      [routine()],
      new Date("2026-11-08T06:00:00.000Z"),
      new Date("2026-11-15T06:00:00.000Z"),
    );
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({ title: "Upper body and run", startAt: "2026-11-09T13:00:00.000Z", endAt: "2026-11-09T14:00:00.000Z" });
  });

  it("supports daily and monthly schedules and omits paused routines", () => {
    const rangeStart = new Date("2026-11-10T06:00:00.000Z");
    const rangeEnd = new Date("2026-11-13T06:00:00.000Z");
    expect(routineOccurrences([routine({ cadence: "DAILY" })], rangeStart, rangeEnd)).toHaveLength(3);
    expect(routineOccurrences([routine({ cadence: "MONTHLY", scheduleDayOfMonth: 11 })], rangeStart, rangeEnd)).toHaveLength(1);
    expect(routineOccurrences([routine({ active: false })], rangeStart, rangeEnd)).toHaveLength(0);
  });
});
