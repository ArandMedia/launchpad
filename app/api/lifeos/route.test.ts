import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type StoredGoal = {
  id: string;
  ownerId: string;
  title: string;
  horizon: string;
  parentId: string | null;
  done: boolean;
  completedAt: Date | null;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredReview = {
  id: string;
  ownerId: string;
  date: Date;
  intended: string;
  actual: string;
  learned: string;
  next: string;
  createdAt: Date;
  updatedAt: Date;
};

type StoredBlock = {
  id: string;
  ownerId: string;
  title: string;
  note: string;
  category: string;
  status: string;
  startAt: Date;
  endAt: Date;
  objectiveId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const state = vi.hoisted(() => ({
  ownerId: null as string | null,
  goals: [] as StoredGoal[],
  reviews: [] as StoredReview[],
  blocks: [] as StoredBlock[],
  nextId: 1,
}));

vi.mock("@/lib/lifeos-auth", () => ({
  lifeOSOwner: vi.fn(async () => state.ownerId),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lifeOSGoal: {
      findMany: vi.fn(async ({ where }: { where: { ownerId: string } }) =>
        state.goals.filter((goal) => goal.ownerId === where.ownerId)
      ),
      findFirst: vi.fn(async ({ where }: { where: { id: string; ownerId: string } }) =>
        state.goals.find((goal) => goal.id === where.id && goal.ownerId === where.ownerId) ?? null
      ),
      create: vi.fn(async ({ data }: { data: Omit<StoredGoal, "id" | "done" | "completedAt" | "createdAt" | "updatedAt"> }) => {
        const now = new Date();
        const goal: StoredGoal = {
          ...data,
          id: `goal-${state.nextId++}`,
          done: false,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        state.goals.push(goal);
        return goal;
      }),
      updateMany: vi.fn(async ({ where, data }: {
        where: { id: string; ownerId: string };
        data: Partial<Pick<StoredGoal, "done" | "completedAt" | "startAt" | "endAt">>;
      }) => {
        const goal = state.goals.find((candidate) => candidate.id === where.id && candidate.ownerId === where.ownerId);
        if (!goal) return { count: 0 };
        Object.assign(goal, data, { updatedAt: new Date() });
        return { count: 1 };
      }),
    },
    lifeOSReview: {
      findMany: vi.fn(async ({ where }: { where: { ownerId: string } }) =>
        state.reviews.filter((review) => review.ownerId === where.ownerId)
      ),
      upsert: vi.fn(async ({ where, create, update }: {
        where: { ownerId_date: { ownerId: string; date: Date } };
        create: Omit<StoredReview, "id" | "createdAt" | "updatedAt">;
        update: Pick<StoredReview, "intended" | "actual" | "learned" | "next">;
      }) => {
        const key = where.ownerId_date;
        const review = state.reviews.find(
          (candidate) => candidate.ownerId === key.ownerId && candidate.date.valueOf() === key.date.valueOf()
        );
        if (review) {
          Object.assign(review, update, { updatedAt: new Date() });
          return review;
        }
        const now = new Date();
        const created: StoredReview = { ...create, id: `review-${state.nextId++}`, createdAt: now, updatedAt: now };
        state.reviews.push(created);
        return created;
      }),
    },
    lifeOSTimeBlock: {
      findMany: vi.fn(async ({ where }: { where: { ownerId: string } }) =>
        state.blocks.filter((block) => block.ownerId === where.ownerId)
      ),
      create: vi.fn(async ({ data }: { data: Omit<StoredBlock, "id" | "createdAt" | "updatedAt"> }) => {
        const now = new Date();
        const created: StoredBlock = { ...data, id: `block-${state.nextId++}`, createdAt: now, updatedAt: now };
        state.blocks.push(created);
        return created;
      }),
      updateMany: vi.fn(async ({ where, data }: {
        where: { id: string; ownerId: string };
        data: Partial<Omit<StoredBlock, "id" | "ownerId" | "createdAt" | "updatedAt">>;
      }) => {
        const block = state.blocks.find((candidate) => candidate.id === where.id && candidate.ownerId === where.ownerId);
        if (!block) return { count: 0 };
        Object.assign(block, data, { updatedAt: new Date() });
        return { count: 1 };
      }),
    },
  },
}));

import { GET, PATCH, POST } from "@/app/api/lifeos/route";

function request(method: "POST" | "PATCH", body: object) {
  return new NextRequest("http://launchpad.test/api/lifeos", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("LifeOS API", () => {
  beforeEach(() => {
    state.ownerId = null;
    state.goals.length = 0;
    state.reviews.length = 0;
    state.blocks.length = 0;
    state.nextId = 1;
  });

  it("fails closed for every endpoint", async () => {
    const responses = await Promise.all([
      GET(),
      POST(request("POST", { kind: "goal", title: "Hidden", horizon: "YEAR" })),
      PATCH(request("PATCH", { id: "goal-1", done: true })),
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
  });

  it("creates and links owner goals while rejecting a foreign parent", async () => {
    state.ownerId = "owner-user";
    state.goals.push({
      id: "foreign-goal",
      ownerId: "other-user",
      title: "Foreign",
      horizon: "YEAR",
      parentId: null,
      done: false,
      completedAt: null,
      startAt: null,
      endAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const rootResponse = await POST(request("POST", { kind: "goal", title: "  Operation OMNIS  ", horizon: "LIFETIME" }));
    const root = (await rootResponse.json()).goal as StoredGoal;
    const childResponse = await POST(request("POST", { kind: "goal", title: "Annual outcome", horizon: "YEAR", parentId: root.id }));
    const child = (await childResponse.json()).goal as StoredGoal;
    const foreignResponse = await POST(request("POST", { kind: "goal", title: "Leak", horizon: "DAY", parentId: "foreign-goal" }));

    expect(rootResponse.status).toBe(201);
    expect(root.title).toBe("Operation OMNIS");
    expect(childResponse.status).toBe(201);
    expect(child.parentId).toBe(root.id);
    expect(foreignResponse.status).toBe(400);
  });

  it("completes, reopens, and retains owner data across reloads", async () => {
    state.ownerId = "owner-user";
    const createResponse = await POST(request("POST", { kind: "goal", title: "Ship HUD", horizon: "SPRINT" }));
    const goal = (await createResponse.json()).goal as StoredGoal;

    expect((await PATCH(request("PATCH", { id: goal.id, done: true }))).status).toBe(200);
    expect(state.goals[0].done).toBe(true);
    expect(state.goals[0].completedAt).toBeInstanceOf(Date);

    expect((await PATCH(request("PATCH", { id: goal.id, done: false }))).status).toBe(200);
    expect(state.goals[0].done).toBe(false);
    expect(state.goals[0].completedAt).toBeNull();

    const reload = await GET();
    const data = await reload.json();
    expect(data.goals).toHaveLength(1);
    expect(data.goals[0]).toMatchObject({ id: goal.id, title: "Ship HUD", done: false });
  });

  it("upserts a daily AAR and returns its latest content after reload", async () => {
    state.ownerId = "owner-user";
    const initial = {
      kind: "review",
      date: "2026-11-10",
      intended: "Finish the HUD",
      actual: "Built the foundation",
      learned: "Test the boundary",
      next: "Run the migration",
    };

    expect((await POST(request("POST", initial))).status).toBe(200);
    expect((await POST(request("POST", { ...initial, learned: "Owner checks must be exact" }))).status).toBe(200);
    expect(state.reviews).toHaveLength(1);

    const reload = await GET();
    const data = await reload.json();
    expect(data.reviews).toHaveLength(1);
    expect(data.reviews[0].learned).toBe("Owner checks must be exact");
  });

  it("creates, edits, and clears a precise optional schedule", async () => {
    state.ownerId = "owner-user";
    const createResponse = await POST(request("POST", {
      kind: "goal",
      title: "Scheduled outcome",
      horizon: "MONTH",
      startAt: "2026-11-10T15:00:00.000Z",
      endAt: "2026-11-10T17:00:00.000Z",
    }));
    const goal = (await createResponse.json()).goal as StoredGoal;
    expect(createResponse.status).toBe(201);
    expect(goal.startAt).toBe("2026-11-10T15:00:00.000Z");

    expect((await PATCH(request("PATCH", {
      action: "schedule",
      id: goal.id,
      startAt: "2027-01-01T18:00:00.000Z",
      endAt: "2027-01-02T00:00:00.000Z",
    }))).status).toBe(200);
    expect(state.goals[0].startAt?.toISOString()).toBe("2027-01-01T18:00:00.000Z");

    expect((await PATCH(request("PATCH", { action: "schedule", id: goal.id, startAt: null, endAt: null }))).status).toBe(200);
    expect(state.goals[0].startAt).toBeNull();
    expect(state.goals[0].endAt).toBeNull();
  });

  it("keeps unscheduled goals valid and rejects incomplete or reversed schedules", async () => {
    state.ownerId = "owner-user";
    const unscheduled = await POST(request("POST", { kind: "goal", title: "Someday", horizon: "LIFETIME" }));
    expect(unscheduled.status).toBe(201);
    expect(state.goals[0]).toMatchObject({ startAt: null, endAt: null });
    expect((await POST(request("POST", { kind: "goal", title: "Half", horizon: "DAY", startAt: "2026-11-10T15:00:00.000Z" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { action: "schedule", id: state.goals[0].id, startAt: "2026-11-10T17:00:00.000Z", endAt: "2026-11-10T15:00:00.000Z" }))).status).toBe(400);
  });

  it("validates horizons, dates, and update ownership", async () => {
    state.ownerId = "owner-user";

    expect((await POST(request("POST", { kind: "goal", title: "Nope", horizon: "DECADE" }))).status).toBe(400);
    expect((await POST(request("POST", { kind: "review", date: "2026-02-30" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { id: "foreign-goal", done: true }))).status).toBe(404);
  });

  it("creates, reloads, edits, and completes an owner-scoped time block", async () => {
    state.ownerId = "owner-user";
    const goalResponse = await POST(request("POST", { kind: "goal", title: "Launch outcome", horizon: "SPRINT" }));
    const goal = (await goalResponse.json()).goal as StoredGoal;
    const createResponse = await POST(request("POST", {
      kind: "block",
      title: "Build launch page",
      note: "Focus mode",
      category: "Deep work",
      status: "PLANNED",
      objectiveId: goal.id,
      startAt: "2026-11-10T15:00:00.000Z",
      endAt: "2026-11-10T16:30:00.000Z",
    }));
    const created = (await createResponse.json()).block as StoredBlock;
    expect(createResponse.status).toBe(201);
    expect(created).toMatchObject({ title: "Build launch page", objectiveId: goal.id, status: "PLANNED" });

    expect((await PATCH(request("PATCH", {
      action: "block",
      id: created.id,
      title: "Build and verify launch page",
      note: "",
      category: "Deep work",
      status: "IN_PROGRESS",
      objectiveId: goal.id,
      startAt: "2026-11-10T15:15:00.000Z",
      endAt: "2026-11-10T17:00:00.000Z",
    }))).status).toBe(200);
    expect((await PATCH(request("PATCH", { action: "block-status", id: created.id, status: "COMPLETED" }))).status).toBe(200);
    const data = await (await GET()).json();
    expect(data.blocks).toHaveLength(1);
    expect(data.blocks[0]).toMatchObject({ title: "Build and verify launch page", status: "COMPLETED" });
  });

  it("validates block ownership, objective links, timestamps, fields, and status", async () => {
    state.ownerId = "owner-user";
    state.goals.push({
      id: "foreign-goal", ownerId: "other-user", title: "Foreign", horizon: "DAY", parentId: null,
      done: false, completedAt: null, startAt: null, endAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    const base = {
      kind: "block", title: "Focus", note: "", category: "", status: "PLANNED",
      startAt: "2026-11-10T15:00:00.000Z", endAt: "2026-11-10T16:00:00.000Z",
    };
    expect((await POST(request("POST", { ...base, objectiveId: "foreign-goal" }))).status).toBe(400);
    expect((await POST(request("POST", { ...base, status: "DELETED" }))).status).toBe(400);
    expect((await POST(request("POST", { ...base, endAt: base.startAt }))).status).toBe(400);
    expect((await POST(request("POST", { ...base, title: "" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { action: "block-status", id: "missing", status: "COMPLETED" }))).status).toBe(404);
  });
});
