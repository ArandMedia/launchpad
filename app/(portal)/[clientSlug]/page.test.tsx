import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  query: null as null | Record<string, any>,
  session: { kind: "client", clientId: "client-1", slug: "acme", email: "client@example.com" },
}));

vi.mock("@/lib/current-session", () => ({ getClientSession: vi.fn(async () => state.session) }));
vi.mock("@/lib/db", () => ({ db: { client: { findUnique: vi.fn(async (query) => {
  state.query = query;
  return { id: "client-1", name: "Acme", projects: [] };
}) } } }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("../../components/PortalLogoutButton", () => ({ default: () => <button>Sign out</button> }));
vi.mock("./PortalProjectList", () => ({ default: () => <div>Project list</div> }));

import ClientPortal from "./page";

describe("client portal data boundaries", () => {
  beforeEach(() => { state.query = null; });

  it("loads the signed-in client's history while filtering private updates and documents", async () => {
    const html = renderToStaticMarkup(await ClientPortal({ params: Promise.resolve({ clientSlug: "acme" }) }));
    expect(html).toContain("Acme");
    expect(state.query?.where).toEqual({ slug: "acme" });
    const projects = state.query?.include.projects;
    expect(projects.where).toBeUndefined();
    expect(projects.updates).toBeUndefined();
    expect(projects.include.updates.where).toEqual({ clientVisible: true });
    expect(projects.include.documents.where).toEqual({ clientVisible: true });
  });
});
