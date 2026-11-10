import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/session";

const authState = vi.hoisted(() => ({ session: null as Session | null }));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: "test-token" }) }),
}));

vi.mock("@/lib/session", () => ({
  TEAM_COOKIE: "launchpad_session",
  verifySession: vi.fn(async () => authState.session),
}));

import { isLifeOSOwner, lifeOSOwner } from "@/lib/lifeos-auth";

describe("LifeOS owner access", () => {
  const previousOwnerId = process.env.LIFEOS_OWNER_USER_ID;

  beforeEach(() => {
    process.env.LIFEOS_OWNER_USER_ID = "owner-user";
    authState.session = null;
  });

  afterEach(() => {
    if (previousOwnerId === undefined) delete process.env.LIFEOS_OWNER_USER_ID;
    else process.env.LIFEOS_OWNER_USER_ID = previousOwnerId;
  });

  it("fails closed when the owner setting is missing", async () => {
    delete process.env.LIFEOS_OWNER_USER_ID;
    authState.session = { kind: "team", userId: "owner-user", email: "owner@example.com", role: "ADMIN" };

    expect(isLifeOSOwner(authState.session)).toBe(false);
    await expect(lifeOSOwner()).resolves.toBeNull();
  });

  it.each([
    ["a signed-out user", null],
    ["a client user", { kind: "client", clientId: "client-1", slug: "client", email: "client@example.com" }],
    ["a non-owner admin", { kind: "team", userId: "other-admin", email: "admin@example.com", role: "ADMIN" }],
    ["a non-owner team user", { kind: "team", userId: "team-user", email: "team@example.com", role: "TEAM" }],
  ] satisfies Array<[string, Session | null]>)("rejects %s", async (_label, session) => {
    authState.session = session;

    expect(isLifeOSOwner(session)).toBe(false);
    await expect(lifeOSOwner()).resolves.toBeNull();
  });

  it("accepts only the configured team owner", async () => {
    authState.session = { kind: "team", userId: "owner-user", email: "owner@example.com", role: "ADMIN" };

    expect(isLifeOSOwner(authState.session)).toBe(true);
    await expect(lifeOSOwner()).resolves.toBe("owner-user");
  });
});
