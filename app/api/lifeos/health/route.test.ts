import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ ownerId: null as string | null }));
vi.mock("@/lib/lifeos-auth", () => ({ lifeOSOwner: vi.fn(async () => state.ownerId) }));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET, POST } from "./route";

describe("LifeOS health API boundary", () => {
  beforeEach(() => { state.ownerId = null; });

  it("fails closed for history and check-ins", async () => {
    const get = await GET(new NextRequest("http://launchpad.test/api/lifeos/health"));
    const post = await POST(new NextRequest("http://launchpad.test/api/lifeos/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: "2026-11-10", values: { rem_minutes: 90 } }) }));
    expect([get.status, post.status]).toEqual([404, 404]);
  });
});
