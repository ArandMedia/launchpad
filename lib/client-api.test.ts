import { afterEach, describe, expect, it, vi } from "vitest";
import { clientApi } from "@/lib/client-api";

afterEach(() => vi.unstubAllGlobals());

describe("clientApi", () => {
  it("returns JSON from a successful API response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    await expect(clientApi<{ ok: boolean }>("/api/test")).resolves.toEqual({ ok: true });
  });

  it("surfaces a server error instead of silently continuing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Choose a valid date" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })));
    await expect(clientApi("/api/test")).rejects.toThrow("Choose a valid date");
  });

  it("recognizes an expired session that redirected to sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      redirected: true,
      url: "https://launchpad.arandmedia.com/login",
      headers: new Headers({ "Content-Type": "text/html" }),
      json: vi.fn(),
    })));
    await expect(clientApi("/api/test")).rejects.toThrow("session expired");
  });
});
