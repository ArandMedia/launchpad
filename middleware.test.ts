import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { CLIENT_COOKIE, TEAM_COOKIE, signSession } from "@/lib/session";

describe("LifeOS proxy boundaries", () => {
  const previousSecret = process.env.SESSION_SECRET;

  beforeAll(() => {
    process.env.SESSION_SECRET = "middleware-test-secret";
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  });

  it.each(["/lifeos", "/api/lifeos"])("redirects signed-out internal requests for %s", async (pathname) => {
    const response = await proxy(new NextRequest(`https://launchpad.example${pathname}`));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://launchpad.example/login");
  });

  it.each(["/icon.png", "/manifest.webmanifest"])("keeps installable app asset %s public", async (pathname) => {
    const response = await proxy(new NextRequest(`https://launchpad.example${pathname}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/lifeos", "/api/lifeos"])("returns a clean 404 to portal clients for %s", async (pathname) => {
    const token = await signSession({
      kind: "client",
      clientId: "client-1",
      slug: "acme",
      email: "client@example.com",
    });
    const request = new NextRequest(`https://portal.example${pathname}`, {
      headers: { host: "portal.example", cookie: `${CLIENT_COOKIE}=${token}` },
    });

    const response = await proxy(request);
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not found");
  });

  it.each(["/projects/project-1", "/clients", "/api/projects", "/api/clients"])("does not expose internal work route %s on the portal domain", async (pathname) => {
    const token = await signSession({ kind: "client", clientId: "client-1", slug: "acme", email: "client@example.com" });
    const response = await proxy(new NextRequest(`https://portal.example${pathname}`, {
      headers: { host: "portal.example", cookie: `${CLIENT_COOKIE}=${token}` },
    }));
    expect(response.status).toBe(404);
  });

  it("keeps a portal session scoped to its own client slug", async () => {
    const token = await signSession({ kind: "client", clientId: "client-1", slug: "acme", email: "client@example.com" });
    const own = await proxy(new NextRequest("https://portal.example/acme", {
      headers: { host: "portal.example", cookie: `${CLIENT_COOKIE}=${token}` },
    }));
    const other = await proxy(new NextRequest("https://portal.example/another-client", {
      headers: { host: "portal.example", cookie: `${CLIENT_COOKIE}=${token}` },
    }));
    expect(own.status).toBe(200);
    expect(other.status).toBe(307);
    expect(other.headers.get("location")).toBe("https://portal.example/portal-login");
  });

  it("passes document downloads to route-level ownership checks", async () => {
    const response = await proxy(new NextRequest("https://portal.example/api/documents/document-1/download", {
      headers: { host: "portal.example" },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not treat a client cookie as an internal team session", async () => {
    const token = await signSession({
      kind: "client",
      clientId: "client-1",
      slug: "acme",
      email: "client@example.com",
    });
    const request = new NextRequest("https://launchpad.example/lifeos", {
      headers: { cookie: `${CLIENT_COOKIE}=${token}` },
    });

    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://launchpad.example/login");
  });

  it("lets team sessions reach the page-level owner check", async () => {
    const token = await signSession({
      kind: "team",
      userId: "non-owner-admin",
      email: "admin@example.com",
      role: "ADMIN",
    });
    const request = new NextRequest("https://launchpad.example/lifeos", {
      headers: { cookie: `${TEAM_COOKIE}=${token}` },
    });

    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
