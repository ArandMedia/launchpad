import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  authorized: true,
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/require-auth", () => ({
  requireTeamSession: vi.fn(async () => state.authorized
    ? { session: { kind: "team", userId: "user-1", email: "owner@example.com", role: "ADMIN" } }
    : { error: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    project: {
      update: vi.fn(async ({ data }) => {
        state.updates.push(data);
        return { id: "project-1", name: data.name ?? "Grizzly Drew", client: { email: "client@example.com" } };
      }),
    },
    update: { create: vi.fn() },
  },
}));
vi.mock("@/lib/notifications", () => ({ notifyClient: vi.fn() }));
vi.mock("@vercel/blob", () => ({ del: vi.fn() }));

import { PATCH, POST } from "./route";

const props = { params: Promise.resolve({ id: "project-1" }) };

function request(body: unknown) {
  return new NextRequest("http://launchpad.test/api/projects/project-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return new NextRequest("http://launchpad.test/api/projects/project-1", {
    method: "POST",
    body: form,
  });
}

describe("project update API", () => {
  beforeEach(() => {
    state.authorized = true;
    state.updates = [];
  });

  it("fails closed without a team session", async () => {
    state.authorized = false;
    expect((await PATCH(request({ name: "No" }), props)).status).toBe(401);
    expect((await POST(formRequest({ name: "No" }), props)).status).toBe(401);
    expect(state.updates).toEqual([]);
  });

  it("rejects invalid project fields before touching the record", async () => {
    expect((await PATCH(request({ name: "   " }), props)).status).toBe(400);
    expect((await PATCH(request({ status: "UNKNOWN" }), props)).status).toBe(400);
    expect((await PATCH(request({ targetDate: "2026-02-30" }), props)).status).toBe(400);
    expect(state.updates).toEqual([]);
  });

  it("normalizes and saves valid edits", async () => {
    const response = await PATCH(request({
      name: "  Grizzly Drew  ",
      description: "Updated brief",
      status: "IN_PROGRESS",
      startDate: "2026-11-11",
      targetDate: null,
    }), props);

    expect(response.status).toBe(200);
    expect(state.updates).toEqual([expect.objectContaining({
      name: "Grizzly Drew",
      description: "Updated brief",
      status: "IN_PROGRESS",
      startDate: new Date("2026-11-11T00:00:00.000Z"),
      targetDate: null,
    })]);
  });

  it("saves pasted and cleared text through the native form fallback", async () => {
    const response = await POST(formRequest({
      name: "Grizzly Drew",
      description: "Pasted replacement text",
      problem: "",
      solution: "Updated solution",
      desiredOutcome: "Updated outcome",
      status: "IN_PROGRESS",
      startDate: "2026-11-11",
      targetDate: "2027-01-15",
    }), props);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://launchpad.test/projects/project-1");
    expect(state.updates).toEqual([expect.objectContaining({
      name: "Grizzly Drew",
      description: "Pasted replacement text",
      problem: null,
      solution: "Updated solution",
      desiredOutcome: "Updated outcome",
      status: "IN_PROGRESS",
      startDate: new Date("2026-11-11T00:00:00.000Z"),
      targetDate: new Date("2027-01-15T00:00:00.000Z"),
    })]);
  });
});
