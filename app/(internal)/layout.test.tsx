import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ owner: false }));

vi.mock("@/lib/current-session", () => ({
  getTeamSession: vi.fn(async () => ({ kind: "team", userId: "user-1", role: "ADMIN" })),
}));

vi.mock("@/lib/lifeos-auth", () => ({
  isLifeOSOwner: vi.fn(() => state.owner),
}));

vi.mock("../components/LogoutButton", () => ({ default: () => <button>Sign out</button> }));

import InternalLayout from "./layout";

describe("internal navigation", () => {
  beforeEach(() => { state.owner = false; });

  it("shows the LifeOS Calendar entry to the configured owner", async () => {
    state.owner = true;
    const html = renderToStaticMarkup(await InternalLayout({ children: <main>Dashboard</main> }));
    expect(html).toContain('href="/lifeos"');
    expect(html).toContain("LifeOS Calendar");
  });

  it("does not reveal the LifeOS entry to another team user", async () => {
    const html = renderToStaticMarkup(await InternalLayout({ children: <main>Dashboard</main> }));
    expect(html).not.toContain('href="/lifeos"');
    expect(html).not.toContain("LifeOS Calendar");
  });
});
