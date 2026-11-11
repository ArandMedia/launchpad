import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Entry = { id: string; ownerId: string; kind: string; title: string; body: string; tags: string[]; inkData: string; occurredOn: Date; createdAt: Date; updatedAt: Date };
const state = vi.hoisted(() => ({ ownerId: null as string | null, entries: [] as Entry[], activities: [] as Record<string, unknown>[], nextId: 1 }));

vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({
  db: {
    lifeOSJournalEntry: {
      findMany: vi.fn(async ({ where }) => state.entries.filter((entry) => entry.ownerId === where.ownerId && (!where.kind || entry.kind === where.kind) && (!where.OR || entry.title.toLowerCase().includes(where.OR[0].title.contains.toLowerCase()) || entry.body.toLowerCase().includes(where.OR[1].body.contains.toLowerCase()) || entry.tags.includes(where.OR[2].tags.has)))),
      create: vi.fn(async ({ data }) => { const now = new Date(); const entry = { id: `entry-${state.nextId++}`, ...data, createdAt: now, updatedAt: now }; state.entries.push(entry); return entry; }),
      updateMany: vi.fn(async ({ where, data }) => { const entry = state.entries.find((item) => item.id === where.id && item.ownerId === where.ownerId); if (!entry) return { count: 0 }; Object.assign(entry, data, { updatedAt: new Date() }); return { count: 1 }; }),
    },
    lifeOSActivity: { create: vi.fn(async ({ data }) => { state.activities.push(data); return data; }) },
  },
}));

import { GET, PATCH, POST } from "@/app/api/lifeos/journal/route";

function request(method: "GET" | "POST" | "PATCH", body?: object, query = "") {
  return new NextRequest(`http://launchpad.test/api/lifeos/journal${query}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}

describe("LifeOS journal API", () => {
  beforeEach(() => { state.ownerId = null; state.entries.length = 0; state.activities.length = 0; state.nextId = 1; });

  it("fails closed before reading or writing private entries", async () => {
    expect((await GET(request("GET"))).status).toBe(404);
    expect((await POST(request("POST", { kind: "NOTE", title: "Private", occurredOn: "2026-11-11" }))).status).toBe(404);
  });

  it("creates owner-scoped searchable writing with Apple Pencil ink", async () => {
    state.ownerId = "owner-user";
    const response = await POST(request("POST", { kind: "JOURNAL", title: "OMNIS reflection", body: "Clean water systems", tags: ["OMNIS", "water"], occurredOn: "2026-11-11", inkData: JSON.stringify([{ points: [{ x: 0.1, y: 0.2, p: 0.6 }] }]) }));
    expect(response.status).toBe(201);
    expect(state.entries[0]).toMatchObject({ ownerId: "owner-user", kind: "JOURNAL", tags: ["omnis", "water"] });
    const data = await (await GET(request("GET", undefined, "?q=water"))).json();
    expect(data.entries).toHaveLength(1);
    expect(state.activities.at(-1)).toMatchObject({ entityType: "JOURNAL_ENTRY", action: "CREATED" });
  });

  it("edits only the signed-in owner's entry and validates dates", async () => {
    state.ownerId = "owner-user";
    state.entries.push({ id: "entry-1", ownerId: "owner-user", kind: "NOTE", title: "Draft", body: "", tags: [], inkData: "", occurredOn: new Date("2026-11-11T12:00:00Z"), createdAt: new Date(), updatedAt: new Date() });
    const update = await PATCH(request("PATCH", { id: "entry-1", kind: "NOTE", title: "Updated", body: "Searchable", tags: [], occurredOn: "2026-11-12", inkData: "" }));
    expect(update.status).toBe(200);
    expect(state.entries[0].title).toBe("Updated");
    expect((await PATCH(request("PATCH", { id: "entry-1", kind: "NOTE", title: "Bad", occurredOn: "2026-02-30" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { id: "foreign", kind: "NOTE", title: "No", occurredOn: "2026-11-12" }))).status).toBe(404);
  });
});
