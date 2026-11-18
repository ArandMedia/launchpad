import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Resource = {
  id: string;
  ownerId: string;
  pillarKey: string;
  category: string;
  resourceType: string;
  title: string;
  description: string;
  url: string;
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const state = vi.hoisted(() => ({ ownerId: null as string | null, resources: [] as Resource[], activities: [] as Record<string, unknown>[], nextId: 1 }));

vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({
  db: {
    lifeOSPillarResource: {
      findMany: vi.fn(async ({ where }) => state.resources.filter((resource) => resource.ownerId === where.ownerId)),
      findFirst: vi.fn(async ({ where }) => state.resources.find((resource) => resource.id === where.id && resource.ownerId === where.ownerId) ?? null),
      create: vi.fn(async ({ data }) => {
        const now = new Date();
        const resource = { id: `resource-${state.nextId++}`, ...data, createdAt: now, updatedAt: now } as Resource;
        state.resources.push(resource);
        return resource;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        const resource = state.resources.find((item) => item.id === where.id && item.ownerId === where.ownerId);
        if (!resource) return { count: 0 };
        Object.assign(resource, data, { updatedAt: new Date() });
        return { count: 1 };
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const before = state.resources.length;
        state.resources = state.resources.filter((item) => !(item.id === where.id && item.ownerId === where.ownerId));
        return { count: before - state.resources.length };
      }),
    },
    lifeOSActivity: { create: vi.fn(async ({ data }) => { state.activities.push(data); return data; }) },
  },
}));

import { DELETE, GET, PATCH, POST } from "./route";

function request(method: "POST" | "PATCH" | "DELETE", body: object) {
  return new NextRequest("http://launchpad.test/api/lifeos/pillar-resources", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("pillar resources API", () => {
  beforeEach(() => {
    state.ownerId = null;
    state.resources.length = 0;
    state.activities.length = 0;
    state.nextId = 1;
  });

  it("fails closed for anyone except the Calendar owner", async () => {
    expect((await GET()).status).toBe(404);
    expect((await POST(request("POST", { pillarKey: "HEALTH", category: "Nutrition", resourceType: "LINK", title: "Private" }))).status).toBe(404);
  });

  it("creates and reads an owner-scoped resource", async () => {
    state.ownerId = "owner-1";
    const response = await POST(request("POST", { pillarKey: "HEALTH", category: "Nutrition", resourceType: "GUIDE", title: "Meal guide", description: "Useful notes", url: "https://example.com/meal", favorite: true }));
    expect(response.status).toBe(201);
    expect(state.resources[0]).toMatchObject({ ownerId: "owner-1", pillarKey: "HEALTH", favorite: true, url: "https://example.com/meal" });
    const data = await (await GET()).json();
    expect(data.resources[0]).toMatchObject({ title: "Meal guide", builtIn: false });
    expect(state.activities.at(-1)).toMatchObject({ entityType: "PILLAR_RESOURCE", action: "CREATED" });
  });

  it("allows notes without links and blocks unsafe URLs", async () => {
    state.ownerId = "owner-1";
    expect((await POST(request("POST", { pillarKey: "RELATIONSHIPS", category: "Communication", resourceType: "NOTE", title: "Listen first", description: "Ask before advising", url: "" }))).status).toBe(201);
    expect((await POST(request("POST", { pillarKey: "WEALTH", category: "Investing", resourceType: "LINK", title: "Unsafe", url: "javascript:alert(1)" }))).status).toBe(400);
  });

  it("updates and deletes only the owner’s custom resource", async () => {
    state.ownerId = "owner-1";
    await POST(request("POST", { pillarKey: "WEALTH", category: "Budgeting", resourceType: "TOOL", title: "Budget", url: "https://example.com/budget" }));
    const id = state.resources[0].id;
    expect((await PATCH(request("PATCH", { id, pillarKey: "WEALTH", category: "Budgeting", resourceType: "TOOL", title: "Monthly budget", url: "https://example.com/budget", favorite: true }))).status).toBe(200);
    expect(state.resources[0]).toMatchObject({ title: "Monthly budget", favorite: true });
    expect((await DELETE(request("DELETE", { id }))).status).toBe(200);
    expect(state.resources).toHaveLength(0);
  });
});
