import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ownerId: null as string | null,
  tasks: [] as Array<Record<string, unknown>>,
  milestones: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({
  db: {
    task: { findMany: vi.fn(async () => state.tasks) },
    milestone: { findMany: vi.fn(async () => state.milestones) },
  },
}));

import { GET } from "./route";

describe("project agenda API", () => {
  beforeEach(() => {
    state.ownerId = null;
    state.tasks.length = 0;
    state.milestones.length = 0;
  });

  it("fails closed for anyone except the Calendar owner", async () => {
    expect((await GET()).status).toBe(404);
  });

  it("puts unscheduled open work first with project and client context", async () => {
    state.ownerId = "owner-user";
    const project = { id: "project-1", name: "Launch", client: { name: "ArandMedia", companyName: "ArandMedia" } };
    state.tasks.push({
      id: "task-1", title: "Write brief", projectId: "project-1", dueDate: new Date("2026-11-12T12:00:00.000Z"),
      project, timeBlocks: [],
    });
    state.milestones.push({
      id: "milestone-1", title: "Client review", projectId: "project-1", targetDate: new Date("2026-11-11T12:00:00.000Z"),
      project, timeBlocks: [{ id: "block-1", startAt: new Date("2026-11-11T15:00:00.000Z"), endAt: new Date("2026-11-11T16:00:00.000Z"), status: "PLANNED" }],
    });

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({ kind: "TASK", title: "Write brief", projectName: "Launch", clientName: "ArandMedia", scheduledBlocks: [] });
    expect(body.items[1]).toMatchObject({ kind: "MILESTONE", title: "Client review" });
  });
});
