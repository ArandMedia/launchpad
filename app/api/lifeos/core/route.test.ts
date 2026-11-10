import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  ownerId: null as string | null,
  metric: null as null | { id: string; ownerId: string; domainKey: string; name: string },
  healthData: null as null | Record<string, unknown>,
  activities: [] as Array<Record<string, unknown>>,
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
});
