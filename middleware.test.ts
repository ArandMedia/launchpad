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
