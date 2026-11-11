import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  ownerId: null as string | null,
  metric: null as null | { id: string; ownerId: string; domainKey: string; name: string },
  healthData: null as null | Record<string, unknown>,
  activities: [] as Array<Record<string, unknown>>,
  goal: null as null | { id: string; ownerId: string; title: string; done: boolean; targetDate: Date | null; completedAt: Date | null },
  routine: null as null | { id: string; ownerId: string; title: string; cadence: string; notes: string; active: boolean },
  action: null as null | { id: string; ownerId: string; title: string; status: string },
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
    state.routine = null;
    state.action = null;
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
    state.goal = { id: "goal-1", ownerId: "owner-user", title: "Old title", done: false, targetDate: null, completedAt: null };
    const response = await PATCH(request("PATCH", { kind: "goal-update", id: "goal-1", domainKey: "HEALTH", title: "Run a 5K", targetDate: "2027-04-10", done: true }));
    expect(response.status).toBe(200);
    expect(state.goal).toMatchObject({ title: "Run a 5K", done: true });
    expect(state.goal?.targetDate?.toISOString().slice(0, 10)).toBe("2027-04-10");
    expect(state.goal?.completedAt).toBeInstanceOf(Date);
    expect((await PATCH(request("PATCH", { kind: "goal-update", id: "goal-1", title: "Bad", targetDate: "2027-02-30", done: false }))).status).toBe(400);
  });

  it("edits and pauses routines without deleting their history", async () => {
    state.ownerId = "owner-user";
    state.routine = { id: "routine-1", ownerId: "owner-user", title: "Walk", cadence: "DAILY", notes: "", active: true };
    expect((await PATCH(request("PATCH", { kind: "routine-update", id: "routine-1", domainKey: "HEALTH", title: "Morning walk", cadence: "DAILY", notes: "Twenty minutes after breakfast", active: true }))).status).toBe(200);
    expect(state.routine).toMatchObject({ title: "Morning walk", notes: "Twenty minutes after breakfast", active: true });
    expect((await PATCH(request("PATCH", { kind: "routine-status", id: "routine-1", domainKey: "HEALTH", active: false }))).status).toBe(200);
    expect(state.routine?.active).toBe(false);
  });
});
