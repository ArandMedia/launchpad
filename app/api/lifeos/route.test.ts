import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type StoredGoal = {
  id: string;
  ownerId: string;
  title: string;
  purpose?: string;
  nodeType: string;
  horizon: string;
  parentId: string | null;
  done: boolean;
  completedAt: Date | null;
  startAt: Date | null;
  endAt: Date | null;
  domainKey: string;
  targetValue: number | null;
  targetUnit: string;
  targetDate?: Date | null;
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
  projectId?: string | null;
  taskId?: string | null;
  milestoneId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const state = vi.hoisted(() => ({
  ownerId: null as string | null,
  goals: [] as StoredGoal[],
  reviews: [] as StoredReview[],
  blocks: [] as StoredBlock[],
  projects: [] as { id: string; archivedAt: Date | null; status: string }[],
  tasks: [] as { id: string; projectId: string; status: string }[],
  milestones: [] as { id: string; projectId: string; completedAt: Date | null }[],
  nextId: 1,
}));

vi.mock("@/lib/lifeos-auth", () => ({
  lifeOSOwner: vi.fn(async () => state.ownerId),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lifeOSRoutine: {
      findMany: vi.fn(async () => []),
    },
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
      deleteMany: vi.fn(async ({ where }: { where: { id: string; ownerId: string } }) => {
        const index = state.blocks.findIndex((candidate) => candidate.id === where.id && candidate.ownerId === where.ownerId);
        if (index < 0) return { count: 0 };
        state.blocks.splice(index, 1);
        return { count: 1 };
      }),
    },
    project: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.projects.find((project) => project.id === where.id && !project.archivedAt && project.status !== "COMPLETE") ?? null
      ),
    },
    task: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        const task = state.tasks.find((candidate) => candidate.id === where.id && candidate.status !== "DONE");
        const project = task && state.projects.find((candidate) => candidate.id === task.projectId && !candidate.archivedAt && candidate.status !== "COMPLETE");
        return task && project ? { projectId: task.projectId } : null;
      }),
    },
    milestone: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        const milestone = state.milestones.find((candidate) => candidate.id === where.id && !candidate.completedAt);
        const project = milestone && state.projects.find((candidate) => candidate.id === milestone.projectId && !candidate.archivedAt && candidate.status !== "COMPLETE");
        return milestone && project ? { projectId: milestone.projectId } : null;
      }),
    },
  },
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/lifeos/route";

function request(method: "POST" | "PATCH" | "DELETE", body: object) {
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
    state.projects.length = 0;
    state.tasks.length = 0;
    state.milestones.length = 0;
    state.nextId = 1;
  });

  it("fails closed for every endpoint", async () => {
    const responses = await Promise.all([
      GET(),
      POST(request("POST", { kind: "goal", title: "Hidden", horizon: "YEAR" })),
      PATCH(request("PATCH", { id: "goal-1", done: true })),
      DELETE(request("DELETE", { id: "block-1" })),
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404]);
  });

  it("creates and links owner goals while rejecting a foreign parent", async () => {
    state.ownerId = "owner-user";
    state.goals.push({
      id: "foreign-goal",
      ownerId: "other-user",
      title: "Foreign",
      nodeType: "OUTCOME",
      horizon: "YEAR",
      parentId: null,
      done: false,
      completedAt: null,
      startAt: null,
      endAt: null,
      domainKey: "OMNIS",
      targetValue: null,
      targetUnit: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const rootResponse = await POST(request("POST", { kind: "goal", title: "  Operation OMNIS  ", purpose: "Connect every major system", horizon: "LIFETIME" }));
    const root = (await rootResponse.json()).goal as StoredGoal;
    const childResponse = await POST(request("POST", { kind: "goal", title: "Commonwealth Water", nodeType: "BRAND", horizon: "YEAR", parentId: root.id }));
    const child = (await childResponse.json()).goal as StoredGoal;
    const foreignResponse = await POST(request("POST", { kind: "goal", title: "Leak", horizon: "DAY", parentId: "foreign-goal" }));

    expect(rootResponse.status).toBe(201);
    expect(root.title).toBe("Operation OMNIS");
    expect(root.purpose).toBe("Connect every major system");
    expect(root.domainKey).toBe("OMNIS");
    expect(childResponse.status).toBe(201);
    expect(child.parentId).toBe(root.id);
    expect(child.nodeType).toBe("BRAND");
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

  it("stores an optional outcome target date and rejects impossible dates", async () => {
    state.ownerId = "owner-user";
    const response = await POST(request("POST", { kind: "goal", title: "Run a 5K", horizon: "YEAR", domainKey: "HEALTH", targetDate: "2027-04-10" }));
    const goal = (await response.json()).goal as StoredGoal;
    expect(response.status).toBe(201);
    expect(new Date(goal.targetDate!).toISOString().slice(0, 10)).toBe("2027-04-10");
    expect((await POST(request("POST", { kind: "goal", title: "Impossible", horizon: "YEAR", targetDate: "2027-02-30" }))).status).toBe(400);
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
    expect((await DELETE(request("DELETE", { id: created.id }))).status).toBe(200);
    expect(state.blocks).toHaveLength(0);
  });

  it("validates block ownership, objective links, timestamps, fields, and status", async () => {
    state.ownerId = "owner-user";
    state.goals.push({
      id: "foreign-goal", ownerId: "other-user", title: "Foreign", nodeType: "OUTCOME", horizon: "DAY", parentId: null,
      done: false, completedAt: null, startAt: null, endAt: null, createdAt: new Date(), updatedAt: new Date(),
      domainKey: "OMNIS", targetValue: null, targetUnit: "",
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
    expect((await DELETE(request("DELETE", { id: "missing" }))).status).toBe(404);
  });

  it("links open project work while rejecting mismatched or completed sources", async () => {
    state.ownerId = "owner-user";
    state.projects.push({ id: "project-1", archivedAt: null, status: "IN_PROGRESS" });
    state.tasks.push(
      { id: "task-open", projectId: "project-1", status: "TODO" },
      { id: "task-done", projectId: "project-1", status: "DONE" },
    );
    const base = {
      kind: "block", title: "Ship the work", note: "", category: "Project work", status: "PLANNED",
      startAt: "2026-11-10T15:00:00.000Z", endAt: "2026-11-10T16:00:00.000Z",
    };

    const linked = await POST(request("POST", { ...base, projectId: "project-1", taskId: "task-open" }));
    expect(linked.status).toBe(201);
    expect(state.blocks[0]).toMatchObject({ projectId: "project-1", taskId: "task-open", milestoneId: null });
    expect((await POST(request("POST", { ...base, projectId: "another-project", taskId: "task-open" }))).status).toBe(400);
    expect((await POST(request("POST", { ...base, projectId: "project-1", taskId: "task-done" }))).status).toBe(400);
  });
});
