import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type PlanRow = { id: string; ownerId: string; scheduledFor: Date; workoutId: string | null; createdAt: Date; updatedAt: Date; ciphertext: string; iv: string; authTag: string };
const state = vi.hoisted(() => ({ ownerId: null as string | null, plans: [] as PlanRow[], activities: [] as Record<string, unknown>[], nextId: 1 }));

vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({ db: {
  lifeOSWorkoutPlan: {
    findMany: vi.fn(async ({ where }) => state.plans.filter((plan) => plan.ownerId === where.ownerId && plan.scheduledFor >= where.scheduledFor.gte && plan.scheduledFor <= where.scheduledFor.lte)),
    findFirst: vi.fn(async ({ where }) => state.plans.find((plan) => plan.ownerId === where.ownerId && (where.id ? plan.id === where.id : plan.scheduledFor.valueOf() === where.scheduledFor.valueOf())) ?? null),
    create: vi.fn(async ({ data }) => { const now = new Date(); const plan = { id: `plan-${state.nextId++}`, workoutId: null, ...data, createdAt: now, updatedAt: now } as PlanRow; state.plans.push(plan); return plan; }),
    updateMany: vi.fn(async ({ where, data }) => { const plan = state.plans.find((item) => item.id === where.id && item.ownerId === where.ownerId); if (!plan) return { count: 0 }; Object.assign(plan, data, { updatedAt: new Date() }); return { count: 1 }; }),
    deleteMany: vi.fn(async ({ where }) => { const before = state.plans.length; state.plans = state.plans.filter((item) => !(item.id === where.id && item.ownerId === where.ownerId)); return { count: before - state.plans.length }; }),
  },
  lifeOSActivity: { create: vi.fn(async ({ data }) => { state.activities.push(data); return data; }) },
} }));

import { DELETE, GET, PATCH, POST } from "./route";

function request(method: "POST" | "PATCH" | "DELETE", body: object) {
  return new NextRequest("http://launchpad.test/api/lifeos/workout-plans", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
const plan = { title: "Monday strength", notes: "", exercises: [{ itemId: "item-1", catalogId: "back-squat", name: "Back squat", sets: 3, reps: "8", durationMinutes: null, notes: "" }] };

describe("workout plan API", () => {
  beforeEach(() => { process.env.LIFEOS_HEALTH_ENCRYPTION_KEY = "test-health-key-with-at-least-24-characters"; state.ownerId = null; state.plans.length = 0; state.activities.length = 0; state.nextId = 1; });

  it("fails closed for non-owners", async () => {
    expect((await GET(new NextRequest("http://launchpad.test/api/lifeos/workout-plans?from=2026-11-16&to=2026-11-22"))).status).toBe(404);
  });

  it("creates, encrypts, and reads a weekly plan", async () => {
    state.ownerId = "owner-1";
    expect((await POST(request("POST", { scheduledFor: "2026-11-16", plan }))).status).toBe(201);
    expect(state.plans[0].ciphertext).not.toContain("Back squat");
    const data = await (await GET(new NextRequest("http://launchpad.test/api/lifeos/workout-plans?from=2026-11-16&to=2026-11-22"))).json();
    expect(data.plans[0]).toMatchObject({ title: "Monday strength", scheduledFor: "2026-11-16" });
  });

  it("updates and removes only the owner's plan", async () => {
    state.ownerId = "owner-1";
    await POST(request("POST", { scheduledFor: "2026-11-16", plan }));
    const id = state.plans[0].id;
    expect((await PATCH(request("PATCH", { id, scheduledFor: "2026-11-16", plan: { ...plan, title: "Updated" } }))).status).toBe(200);
    expect((await DELETE(request("DELETE", { id }))).status).toBe(200);
    expect(state.plans).toHaveLength(0);
  });
});
