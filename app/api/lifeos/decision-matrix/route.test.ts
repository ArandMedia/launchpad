import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Placement = {
  id: string;
  ownerId: string;
  date: Date;
  sourceKind: string;
  sourceId: string;
  titleSnapshot: string;
  contextSnapshot: string;
  dueAtSnapshot: Date | null;
  quadrant: string;
  createdAt: Date;
  updatedAt: Date;
};

const state = vi.hoisted(() => ({
  ownerId: null as string | null,
  tasks: [] as Array<Record<string, any>>,
  milestones: [] as Array<Record<string, any>>,
  actions: [] as Array<Record<string, any>>,
  placements: [] as Placement[],
  nextId: 1,
}));

const sameDay = (left: Date, right: Date) => left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);

vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({
  db: {
    task: {
      findMany: vi.fn(async () => state.tasks),
      findFirst: vi.fn(async ({ where }) => state.tasks.find((item) => item.id === where.id && item.status !== "DONE") ?? null),
    },
    milestone: {
      findMany: vi.fn(async () => state.milestones),
      findFirst: vi.fn(async ({ where }) => state.milestones.find((item) => item.id === where.id && !item.completedAt) ?? null),
    },
    lifeOSAction: {
      findMany: vi.fn(async () => state.actions),
      findFirst: vi.fn(async ({ where }) => state.actions.find((item) => item.id === where.id && item.ownerId === where.ownerId && item.status === "OPEN") ?? null),
    },
    lifeOSDecisionPlacement: {
      findMany: vi.fn(async ({ where }) => state.placements.filter((item) => item.ownerId === where.ownerId && sameDay(item.date, where.date))),
      findUnique: vi.fn(async ({ where }) => {
        const key = where.ownerId_date_sourceKind_sourceId;
        return state.placements.find((item) => item.ownerId === key.ownerId && sameDay(item.date, key.date) && item.sourceKind === key.sourceKind && item.sourceId === key.sourceId) ?? null;
      }),
      create: vi.fn(async ({ data }) => {
        const now = new Date();
        const placement = { id: `placement-${state.nextId++}`, ...data, createdAt: now, updatedAt: now } as Placement;
        state.placements.push(placement);
        return placement;
      }),
      update: vi.fn(async ({ where, data }) => {
        const placement = state.placements.find((item) => item.id === where.id)!;
        Object.assign(placement, data, { updatedAt: new Date() });
        return placement;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const before = state.placements.length;
        state.placements = state.placements.filter((item) => !(item.ownerId === where.ownerId && sameDay(item.date, where.date) && item.sourceKind === where.sourceKind && item.sourceId === where.sourceId));
        return { count: before - state.placements.length };
      }),
    },
  },
}));

import { GET, PATCH } from "./route";

function request(method: "GET" | "PATCH", body?: object, query = "") {
  return new NextRequest(`http://launchpad.test/api/lifeos/decision-matrix${query}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("daily decision matrix API", () => {
  beforeEach(() => {
    state.ownerId = null;
    state.tasks.length = 0;
    state.milestones.length = 0;
    state.actions.length = 0;
    state.placements.length = 0;
    state.nextId = 1;
  });

  it("fails closed for anyone except the Calendar owner", async () => {
    expect((await GET(request("GET", undefined, "?date=2026-11-13"))).status).toBe(404);
    expect((await PATCH(request("PATCH", { date: "2026-11-13", sourceKind: "PROJECT_TASK", sourceId: "task-1", quadrant: "DO_NOW" }))).status).toBe(404);
  });

  it("gathers open project work and next actions, then stores a placement", async () => {
    state.ownerId = "owner-1";
    const project = { id: "project-1", name: "LaunchPAD", client: { id: "client-1", name: "ArandMedia", companyName: "ArandMedia" } };
    state.tasks.push({ id: "task-1", title: "Finish matrix", status: "TODO", dueDate: new Date("2026-11-13T18:00:00Z"), createdAt: new Date(), project });
    state.milestones.push({ id: "milestone-1", title: "Daily planning live", completedAt: null, targetDate: null, createdAt: new Date(), project });
    state.actions.push({ id: "action-1", ownerId: "owner-1", title: "Review health plan", status: "OPEN", dueAt: null, createdAt: new Date(), domainKey: "HEALTH" });

    const initial = await (await GET(request("GET", undefined, "?date=2026-11-13"))).json();
    expect(initial.items).toHaveLength(3);
    expect(initial.items.every((item: { quadrant: string | null }) => item.quadrant === null)).toBe(true);
    expect(initial.items[0]).toMatchObject({ projectId: "project-1", projectName: "LaunchPAD", clientId: "client-1", clientName: "ArandMedia" });

    expect((await PATCH(request("PATCH", { date: "2026-11-13", sourceKind: "PROJECT_TASK", sourceId: "task-1", quadrant: "DO_NOW" }))).status).toBe(200);
    const placed = await (await GET(request("GET", undefined, "?date=2026-11-13"))).json();
    expect(placed.items.find((item: { sourceId: string }) => item.sourceId === "task-1").quadrant).toBe("DO_NOW");
  });

  it("opens a fresh matrix on the next date without deleting yesterday", async () => {
    state.ownerId = "owner-1";
    const project = { id: "project-1", name: "LaunchPAD", client: { id: "client-1", name: "ArandMedia", companyName: null } };
    state.tasks.push({ id: "task-1", title: "Plan the day", status: "TODO", dueDate: null, createdAt: new Date(), project });
    await PATCH(request("PATCH", { date: "2026-11-12", sourceKind: "PROJECT_TASK", sourceId: "task-1", quadrant: "SCHEDULE" }));

    const nextDay = await (await GET(request("GET", undefined, "?date=2026-11-13"))).json();
    expect(nextDay.items[0].quadrant).toBeNull();
    expect(state.placements).toHaveLength(1);
    expect(state.placements[0].date.toISOString().slice(0, 10)).toBe("2026-11-12");
  });

  it("returns an item to the pool without changing the underlying task", async () => {
    state.ownerId = "owner-1";
    const project = { id: "project-1", name: "LaunchPAD", client: { id: "client-1", name: "ArandMedia", companyName: null } };
    state.tasks.push({ id: "task-1", title: "Plan the day", status: "TODO", dueDate: null, createdAt: new Date(), project });
    await PATCH(request("PATCH", { date: "2026-11-13", sourceKind: "PROJECT_TASK", sourceId: "task-1", quadrant: "DELEGATE" }));
    expect((await PATCH(request("PATCH", { date: "2026-11-13", sourceKind: "PROJECT_TASK", sourceId: "task-1", quadrant: null }))).status).toBe(200);
    expect(state.placements).toHaveLength(0);
    expect(state.tasks[0].status).toBe("TODO");
  });
});
