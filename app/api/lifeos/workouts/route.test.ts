import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type WorkoutRow = { id: string; ownerId: string; occurredAt: Date; createdAt: Date; updatedAt: Date; ciphertext: string; iv: string; authTag: string };
const state = vi.hoisted(() => ({ ownerId: null as string | null, workouts: [] as WorkoutRow[], activities: [] as Record<string, unknown>[], nextId: 1 }));

vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({
  db: {
    lifeOSWorkout: {
      findMany: vi.fn(async ({ where }) => state.workouts.filter((workout) => workout.ownerId === where.ownerId && workout.occurredAt >= where.occurredAt.gte).sort((a, b) => b.occurredAt.valueOf() - a.occurredAt.valueOf())),
      findFirst: vi.fn(async ({ where }) => state.workouts.find((workout) => workout.id === where.id && workout.ownerId === where.ownerId) ?? null),
      create: vi.fn(async ({ data }) => { const now = new Date(); const workout = { id: `workout-${state.nextId++}`, ...data, createdAt: now, updatedAt: now } as WorkoutRow; state.workouts.push(workout); return workout; }),
      updateMany: vi.fn(async ({ where, data }) => { const workout = state.workouts.find((item) => item.id === where.id && item.ownerId === where.ownerId); if (!workout) return { count: 0 }; Object.assign(workout, data, { updatedAt: new Date() }); return { count: 1 }; }),
      deleteMany: vi.fn(async ({ where }) => { const before = state.workouts.length; state.workouts = state.workouts.filter((item) => !(item.id === where.id && item.ownerId === where.ownerId)); return { count: before - state.workouts.length }; }),
    },
    lifeOSWorkoutPlan: {
      findFirst: vi.fn(async ({ where }) => where.id === "plan-1" && where.ownerId === state.ownerId ? { id: "plan-1" } : null),
      updateMany: vi.fn(async ({ where }) => ({ count: where.id === "plan-1" && where.ownerId === state.ownerId ? 1 : 0 })),
    },
    lifeOSActivity: { create: vi.fn(async ({ data }) => { state.activities.push(data); return data; }) },
  },
}));

import { DELETE, GET, PATCH, POST } from "./route";

function request(method: "POST" | "PATCH" | "DELETE", body: object) {
  return new NextRequest("http://launchpad.test/api/lifeos/workouts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

const validWorkout = { activityKey: "STRENGTH", intensity: "MODERATE", performedAt: "2026-11-17T14:30:00.000Z", durationMinutes: 45, bodyWeightLbs: 180, manualCalories: "", notes: "Upper body" };

describe("workout tracker API", () => {
  beforeEach(() => {
    process.env.LIFEOS_HEALTH_ENCRYPTION_KEY = "test-health-key-with-at-least-24-characters";
    state.ownerId = null;
    state.workouts.length = 0;
    state.activities.length = 0;
    state.nextId = 1;
  });

  it("fails closed for anyone except the Calendar owner", async () => {
    expect((await GET(new NextRequest("http://launchpad.test/api/lifeos/workouts"))).status).toBe(404);
    expect((await POST(request("POST", validWorkout))).status).toBe(404);
  });

  it("encrypts, estimates, and returns an owner-scoped workout", async () => {
    state.ownerId = "owner-1";
    const response = await POST(request("POST", validWorkout));
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({ activityLabel: "Strength training", durationMinutes: 45, calorieSource: "ESTIMATED" });
    expect(created.caloriesBurned).toBeGreaterThan(0);
    expect(state.workouts[0].ciphertext).not.toContain("Upper body");
    const data = await (await GET(new NextRequest("http://launchpad.test/api/lifeos/workouts?days=3650"))).json();
    expect(data.workouts[0]).toMatchObject({ notes: "Upper body", bodyWeightLbs: 180 });
  });

  it("uses a manually entered device calorie value when provided", async () => {
    state.ownerId = "owner-1";
    const response = await POST(request("POST", { ...validWorkout, manualCalories: 321 }));
    const created = await response.json();
    expect(created).toMatchObject({ caloriesBurned: 321, calorieSource: "MANUAL" });
  });

  it("links a planned day to the encrypted workout log", async () => {
    state.ownerId = "owner-1";
    const response = await POST(request("POST", { ...validWorkout, planId: "plan-1" }));
    const created = await response.json();
    expect(created).toMatchObject({ planId: "plan-1" });
  });

  it("validates inputs and scopes updates and deletes to the owner", async () => {
    state.ownerId = "owner-1";
    expect((await POST(request("POST", { ...validWorkout, bodyWeightLbs: 0 }))).status).toBe(400);
    await POST(request("POST", validWorkout));
    const id = state.workouts[0].id;
    expect((await PATCH(request("PATCH", { ...validWorkout, id, durationMinutes: 60 }))).status).toBe(200);
    expect((await DELETE(request("DELETE", { id }))).status).toBe(200);
    expect(state.workouts).toHaveLength(0);
  });
});
