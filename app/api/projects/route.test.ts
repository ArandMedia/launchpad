import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  authorized: true,
  created: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/require-auth", () => ({
  requireTeamSession: vi.fn(async () => state.authorized
    ? { session: { kind: "team", userId: "user-1", email: "owner@example.com", role: "ADMIN" } }
    : { error: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) }),
}));
vi.mock("@/lib/db", () => ({ db: {
  project: {
    findMany: vi.fn(async () => []),
    create: vi.fn(async ({ data }) => {
      state.created.push(data);
      return { id: "project-1", ...data };
    }),
  },
  client: { findUnique: vi.fn(async ({ where }) => where.id === "client-1" ? { id: "client-1" } : null) },
} }));

import { GET, POST } from "./route";

function request(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://launchpad.test/api/projects", {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("projects API", () => {
  beforeEach(() => {
    state.authorized = true;
    state.created = [];
  });

  it("requires a team session for reads and writes", async () => {
    state.authorized = false;
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await POST(request("POST", { name: "No", clientId: "client-1" }))).status).toBe(401);
  });

  it("rejects invalid projects without writing", async () => {
    expect((await POST(request("POST", { name: "", clientId: "client-1" }))).status).toBe(400);
    expect((await POST(request("POST", { name: "Project", clientId: "missing" }))).status).toBe(400);
    expect((await POST(request("POST", { name: "Project", clientId: "client-1", targetDate: "2026-02-30" }))).status).toBe(400);
    expect(state.created).toEqual([]);
  });

  it("normalizes and creates a valid project", async () => {
    const response = await POST(request("POST", {
      name: "  Grizzly Drew  ",
      clientId: "client-1",
      status: "IN_PROGRESS",
      startDate: "2026-11-12",
    }));
    expect(response.status).toBe(201);
    expect(state.created).toEqual([expect.objectContaining({
      name: "Grizzly Drew",
      clientId: "client-1",
      status: "IN_PROGRESS",
      startDate: new Date("2026-11-12T00:00:00.000Z"),
    })]);
  });
});
