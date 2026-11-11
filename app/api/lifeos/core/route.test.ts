import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  ownerId: null as string | null,
  metric: null as null | { id: string; ownerId: string; domainKey: string; name: string },
  healthData: null as null | Record<string, unknown>,
  activities: [] as Array<Record<string, unknown>>,
  goal: null as null | { id: string; ownerId: string; domainKey?: string; title: string; purpose: string; nodeType: string; horizon: string; parentId: string | null; done: boolean; targetDate: Date | null; completedAt: Date | null },
  goals: [] as Array<{ id: string; ownerId: string; parentId: string | null }>,
  routine: null as null | { id: string; ownerId: string; title: string; cadence: string; notes: string; active: boolean; objectiveId?: string | null; scheduleTime?: string; scheduleDurationMinutes?: number; scheduleWeekdays?: number[]; scheduleDayOfMonth?: number | null; scheduleStartsOn?: Date | null },
  action: null as null | { id: string; ownerId: string; title: string; status: string },
  principle: null as null | { id: string; ownerId: string; domainKey: string; kind: string; title: string; statement: string; why: string; importance: number; active: boolean },
}));

vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({
  db: {
    lifeOSMetricDefinition: {
      create: vi.fn(async ({ data }) => {
        state.metric = { id: "metric-1", ownerId: data.ownerId, domainKey: data.domainKey, name: data.name };
        return state.metric;
      }),
      findFirst: vi.fn(async ({ where }) => {
        const metric = state.metric;
        if (!metric) return null;
        return metric.id === where.id && metric.ownerId === where.ownerId ? metric : null;
      }),
    },
    lifeOSHealthMeasurement: {
      create: vi.fn(async ({ data }) => { state.healthData = data; return { id: "health-1", ...data }; }),
    },
    lifeOSActivity: {
      create: vi.fn(async ({ data }) => { state.activities.push(data); return { id: `activity-${state.activities.length}`, ...data }; }),
    },
    lifeOSGoal: {
      findMany: vi.fn(async ({ where }) => state.goals.filter((goal) => goal.ownerId === where.ownerId)),
      findFirst: vi.fn(async ({ where }) => state.goal && state.goal.id === where.id && state.goal.ownerId === where.ownerId && (!where.domainKey || state.goal.domainKey === where.domainKey) ? state.goal : null),
      updateMany: vi.fn(async ({ where, data }) => {
        if (!state.goal || state.goal.id !== where.id || state.goal.ownerId !== where.ownerId) return { count: 0 };
        Object.assign(state.goal, data);
        return { count: 1 };
      }),
    },
    lifeOSRoutine: {
      updateMany: vi.fn(async ({ where, data }) => {
        if (!state.routine || state.routine.id !== where.id || state.routine.ownerId !== where.ownerId) return { count: 0 };
        Object.assign(state.routine, data);
        return { count: 1 };
      }),
    },
    lifeOSAction: {
      updateMany: vi.fn(async ({ where, data }) => {
        if (!state.action || state.action.id !== where.id || state.action.ownerId !== where.ownerId) return { count: 0 };
        Object.assign(state.action, data);
        return { count: 1 };
      }),
    },
    lifeOSPrinciple: {
      create: vi.fn(async ({ data }) => {
        state.principle = { id: "principle-1", active: true, ...data };
        return state.principle;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        if (!state.principle || state.principle.id !== where.id || state.principle.ownerId !== where.ownerId || state.principle.domainKey !== where.domainKey) return { count: 0 };
        Object.assign(state.principle, data);
        return { count: 1 };
      }),
    },
  },
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/lifeos/core/route";

function request(method: "POST" | "PATCH" | "DELETE", body: object) {
  return new NextRequest("http://launchpad.test/api/lifeos/core", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("LifeOS modular API", () => {
  beforeEach(() => {
    state.ownerId = null;
    state.metric = null;
    state.healthData = null;
    state.activities.length = 0;
    state.goal = null;
    state.goals.length = 0;
    state.routine = null;
    state.action = null;
    state.principle = null;
    process.env.LIFEOS_HEALTH_ENCRYPTION_KEY = "test-health-key-with-at-least-24-characters";
  });

  afterEach(() => delete process.env.LIFEOS_HEALTH_ENCRYPTION_KEY);

  it("fails closed before any modular data is queried or mutated", async () => {
    const responses = await Promise.all([
      GET(),
      POST(request("POST", { kind: "metric", domainKey: "HEALTH", name: "Resting HR" })),
      PATCH(request("PATCH", { kind: "action-status", id: "action-1", status: "DONE" })),
      DELETE(request("DELETE", { providerKey: "OURA" })),
    ]);
    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404]);
  });

  it("stores health evidence as owner-scoped authenticated ciphertext", async () => {
    state.ownerId = "owner-user";
    expect((await POST(request("POST", { kind: "metric", domainKey: "HEALTH", name: "Resting HR", unit: "bpm" }))).status).toBe(201);
    const response = await POST(request("POST", { kind: "measurement", metricId: "metric-1", value: 61, note: "manual baseline", observedAt: "2026-11-10T12:00:00.000Z" }));
    expect(response.status).toBe(201);
    expect(state.healthData).toMatchObject({ ownerId: "owner-user", metricId: "metric-1" });
    expect(state.healthData).not.toHaveProperty("value");
    expect(JSON.stringify(state.healthData)).not.toContain("manual baseline");
    expect(state.activities.at(-1)).toMatchObject({ domainKey: "HEALTH", action: "RECORDED" });
  });

  it("rejects a measurement when the metric belongs to another owner", async () => {
    state.ownerId = "owner-user";
    state.metric = { id: "metric-foreign", ownerId: "other-user", domainKey: "HEALTH", name: "Private" };
    const response = await POST(request("POST", { kind: "measurement", metricId: "metric-foreign", value: 80, observedAt: "2026-11-10T12:00:00.000Z" }));
    expect(response.status).toBe(400);
    expect(state.healthData).toBeNull();
  });

  it("edits and completes outcomes while preserving owner scope and target dates", async () => {
    state.ownerId = "owner-user";
    state.goal = { id: "goal-1", ownerId: "owner-user", title: "Old title", purpose: "", nodeType: "OUTCOME", horizon: "YEAR", parentId: null, done: false, targetDate: null, completedAt: null };
    const response = await PATCH(request("PATCH", { kind: "goal-update", id: "goal-1", domainKey: "HEALTH", title: "Run a 5K", targetDate: "2027-04-10", done: true }));
    expect(response.status).toBe(200);
    expect(state.goal).toMatchObject({ title: "Run a 5K", done: true });
    expect(state.goal?.targetDate?.toISOString().slice(0, 10)).toBe("2027-04-10");
    expect(state.goal?.completedAt).toBeInstanceOf(Date);
    expect((await PATCH(request("PATCH", { kind: "goal-update", id: "goal-1", title: "Bad", targetDate: "2027-02-30", done: false }))).status).toBe(400);
  });

  it("updates a mind-map purpose and connection while preventing loops", async () => {
    state.ownerId = "owner-user";
    state.goal = { id: "goal-child", ownerId: "owner-user", title: "Build the platform", purpose: "", nodeType: "OUTCOME", horizon: "YEAR", parentId: null, done: false, targetDate: null, completedAt: null };
    state.goals.push(
      { id: "goal-root", ownerId: "owner-user", parentId: null },
      { id: "goal-child", ownerId: "owner-user", parentId: "goal-root" },
      { id: "goal-grandchild", ownerId: "owner-user", parentId: "goal-child" },
    );

    const response = await PATCH(request("PATCH", { kind: "goal-update", id: "goal-child", domainKey: "OMNIS", title: "Build the platform", purpose: "Connect the operating system", nodeType: "BRAND", horizon: "PHASE", parentId: "goal-root", targetDate: null, done: false }));
    expect(response.status).toBe(200);
    expect(state.goal).toMatchObject({ purpose: "Connect the operating system", nodeType: "BRAND", horizon: "PHASE", parentId: "goal-root" });

    const invalidType = await PATCH(request("PATCH", { kind: "goal-update", id: "goal-child", domainKey: "OMNIS", title: "Build the platform", purpose: "", nodeType: "UNKNOWN", horizon: "PHASE", parentId: "goal-root", targetDate: null, done: false }));
    expect(invalidType.status).toBe(400);

    const cycle = await PATCH(request("PATCH", { kind: "goal-update", id: "goal-child", domainKey: "OMNIS", title: "Build the platform", purpose: "", horizon: "PHASE", parentId: "goal-grandchild", targetDate: null, done: false }));
    expect(cycle.status).toBe(400);
  });

  it("edits and pauses routines without deleting their history", async () => {
    state.ownerId = "owner-user";
    state.routine = { id: "routine-1", ownerId: "owner-user", title: "Walk", cadence: "DAILY", notes: "", active: true };
    expect((await PATCH(request("PATCH", { kind: "routine-update", id: "routine-1", domainKey: "HEALTH", title: "Morning walk", cadence: "DAILY", notes: "Twenty minutes after breakfast", active: true }))).status).toBe(200);
    expect(state.routine).toMatchObject({ title: "Morning walk", notes: "Twenty minutes after breakfast", active: true });
    expect((await PATCH(request("PATCH", { kind: "routine-status", id: "routine-1", domainKey: "HEALTH", active: false }))).status).toBe(200);
    expect(state.routine?.active).toBe(false);
  });

  it("validates and saves recurring routine calendar schedules", async () => {
    state.ownerId = "owner-user";
    state.goal = { id: "goal-health", ownerId: "owner-user", domainKey: "HEALTH", title: "Lose 50 pounds", purpose: "", nodeType: "OUTCOME", horizon: "YEAR", parentId: null, done: false, targetDate: null, completedAt: null };
    state.routine = { id: "routine-1", ownerId: "owner-user", title: "Walk", cadence: "WEEKLY", notes: "", active: true };
    const response = await PATCH(request("PATCH", { kind: "routine-update", id: "routine-1", domainKey: "HEALTH", title: "Upper body and run", cadence: "WEEKLY", notes: "Train consistently", active: true, objectiveId: "goal-health", scheduleTime: "07:00", scheduleDurationMinutes: 60, scheduleWeekdays: [1], scheduleDayOfMonth: 1, scheduleStartsOn: "2026-11-09" }));
    expect(response.status).toBe(200);
    expect(state.routine).toMatchObject({ objectiveId: "goal-health", scheduleTime: "07:00", scheduleDurationMinutes: 60, scheduleWeekdays: [1], scheduleDayOfMonth: null });

    const invalid = await PATCH(request("PATCH", { kind: "routine-update", id: "routine-1", domainKey: "HEALTH", title: "Upper body and run", cadence: "WEEKLY", notes: "", active: true, scheduleTime: "07:00", scheduleDurationMinutes: 60, scheduleWeekdays: [], scheduleStartsOn: "2026-11-09" }));
    expect(invalid.status).toBe(400);

    const foreignObjective = await PATCH(request("PATCH", { kind: "routine-update", id: "routine-1", domainKey: "WEALTH", title: "Upper body and run", cadence: "WEEKLY", notes: "", active: true, objectiveId: "goal-health", scheduleTime: "07:00", scheduleDurationMinutes: 60, scheduleWeekdays: [1], scheduleStartsOn: "2026-11-09" }));
    expect(foreignObjective.status).toBe(400);
  });

  it("creates and updates owner-scoped self-knowledge with changing importance", async () => {
    state.ownerId = "owner-user";
    const created = await POST(request("POST", { kind: "principle", domainKey: "SELF", principleKind: "STRENGTH", title: "Systems thinking", statement: "I connect parts into a whole", why: "It helps me build useful things", importance: 5 }));
    expect(created.status).toBe(201);
    expect(state.principle).toMatchObject({ ownerId: "owner-user", kind: "STRENGTH", importance: 5, active: true });

    const updated = await PATCH(request("PATCH", { kind: "principle-update", id: "principle-1", domainKey: "SELF", principleKind: "GROWTH_EDGE", title: "Overcommitting", statement: "I say yes too quickly", why: "My time is more constrained now", importance: 4, active: true }));
    expect(updated.status).toBe(200);
    expect(state.principle).toMatchObject({ kind: "GROWTH_EDGE", title: "Overcommitting", importance: 4 });

    expect((await POST(request("POST", { kind: "principle", domainKey: "SELF", principleKind: "VALUE", title: "Family", importance: 6 }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { kind: "principle-update", id: "principle-1", domainKey: "SELF", principleKind: "UNKNOWN", title: "Invalid", importance: 3, active: true }))).status).toBe(400);
  });
});
