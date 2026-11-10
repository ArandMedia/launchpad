import { describe, expect, it } from "vitest";
import { agendaFor, positionOverlappingBlocks, type TimeBlock } from "./lifeos-blocks";

const block = (id: string, startAt: string, endAt: string, status: TimeBlock["status"] = "PLANNED"): TimeBlock => ({
  id, title: id, note: "", category: "", objectiveId: null, status, startAt, endAt,
});

describe("LifeOS daily blocks", () => {
  it("lays overlapping blocks into stable columns and reuses free columns", () => {
    const positioned = positionOverlappingBlocks([
      block("a", "2026-11-10T15:00:00.000Z", "2026-11-10T17:00:00.000Z"),
      block("b", "2026-11-10T15:30:00.000Z", "2026-11-10T16:00:00.000Z"),
      block("c", "2026-11-10T16:00:00.000Z", "2026-11-10T16:30:00.000Z"),
    ]);
    expect(positioned.map(({ id, column, columnCount }) => ({ id, column, columnCount }))).toEqual([
      { id: "a", column: 0, columnCount: 2 },
      { id: "b", column: 1, columnCount: 2 },
      { id: "c", column: 1, columnCount: 2 },
    ]);
  });

  it("separates active, next, and remaining work without treating completed blocks as next", () => {
    const blocks = [
      block("active", "2026-11-10T15:00:00.000Z", "2026-11-10T16:00:00.000Z", "IN_PROGRESS"),
      block("done", "2026-11-10T16:00:00.000Z", "2026-11-10T16:30:00.000Z", "COMPLETED"),
      block("next", "2026-11-10T16:30:00.000Z", "2026-11-10T17:00:00.000Z"),
    ];
    const agenda = agendaFor(blocks, new Date("2026-11-10T15:30:00.000Z"), true);
    expect(agenda.happeningNow.map(({ id }) => id)).toEqual(["active"]);
    expect(agenda.upNext?.id).toBe("next");
    expect(agenda.remaining).toHaveLength(3);
  });
});
