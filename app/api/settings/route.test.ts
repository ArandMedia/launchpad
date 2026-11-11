import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  session: null as null | { kind: "team"; userId: string; email: string; role: "ADMIN" | "TEAM" },
  owner: false,
  user: {
    id: "user-1",
    name: "Andrew",
    email: "andrew@example.com",
    role: "ADMIN" as const,
    passwordHash: "existing-hash",
    preferences: {} as Record<string, unknown>,
  },
}));

vi.mock("@/lib/current-session", () => ({ getTeamSession: vi.fn(async () => state.session) }));
vi.mock("@/lib/lifeos-auth", () => ({ isLifeOSOwner: vi.fn(() => state.owner) }));
vi.mock("@/lib/db", () => ({
  db: { user: {
    findUnique: vi.fn(async () => state.session ? state.user : null),
    update: vi.fn(async ({ data }) => {
      state.user = { ...state.user, ...data };
      return state.user;
    }),
  } },
}));
vi.mock("@/lib/passwords", () => ({
  verifyPassword: vi.fn(async (value: string) => value === "correct-password"),
  hashPassword: vi.fn(async (value: string) => `hashed:${value}`),
}));
vi.mock("@/lib/session", () => ({
  TEAM_COOKIE: "launchpad_session",
  SESSION_MAX_AGE: 1000,
  signSession: vi.fn(async () => "fresh-session"),
}));

import { GET, PATCH } from "./route";

function request(body: object) {
  return new NextRequest("http://launchpad.test/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("LaunchPAD settings API", () => {
  beforeEach(() => {
    state.session = null;
    state.owner = false;
    state.user = { id: "user-1", name: "Andrew", email: "andrew@example.com", role: "ADMIN", passwordHash: "existing-hash", preferences: {} };
  });

  it("fails closed without a team session", async () => {
    expect((await GET()).status).toBe(404);
    expect((await PATCH(request({ kind: "profile", name: "Test", email: "test@example.com" }))).status).toBe(404);
  });

  it("does not let a team member select the private Calendar landing page", async () => {
    state.session = { kind: "team", userId: "user-1", email: state.user.email, role: "TEAM" };
    const response = await PATCH(request({ kind: "preferences", defaultLanding: "CALENDAR" }));
    expect(response.status).toBe(400);
    expect(state.user.preferences).toEqual({});
  });

  it("updates profile details and refreshes the signed session", async () => {
    state.session = { kind: "team", userId: "user-1", email: state.user.email, role: "ADMIN" };
    const response = await PATCH(request({ kind: "profile", name: "Andrew Arand", email: "NEW@EXAMPLE.COM" }));
    expect(response.status).toBe(200);
    expect(state.user).toMatchObject({ name: "Andrew Arand", email: "new@example.com" });
    expect(response.cookies.get("launchpad_session")?.value).toBe("fresh-session");
  });

  it("requires the current password before storing a replacement hash", async () => {
    state.session = { kind: "team", userId: "user-1", email: state.user.email, role: "ADMIN" };
    expect((await PATCH(request({ kind: "password", currentPassword: "wrong", newPassword: "new-password" }))).status).toBe(400);
    expect(state.user.passwordHash).toBe("existing-hash");
    expect((await PATCH(request({ kind: "password", currentPassword: "correct-password", newPassword: "new-password" }))).status).toBe(200);
    expect(state.user.passwordHash).toBe("hashed:new-password");
  });
});
