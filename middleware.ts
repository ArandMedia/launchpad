import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, TEAM_COOKIE, CLIENT_COOKIE } from "@/lib/session";

// Two domains point at this one deployment:
//   launchpad.arandmedia.com -> internal team dashboard, gated by a team session
//   portal.arandmedia.com    -> client portal, gated by a client session scoped
//                                to that client's own slug
//
// Auth pages and the /api/auth/* routes are always reachable so the login
// flow itself never gets caught in its own gate.

const PUBLIC_INTERNAL_PATHS = ["/login", "/setup"];
const PUBLIC_PORTAL_PATHS = ["/portal-login"];
const INTERNAL_ONLY_PATHS = [/^\/lifeos(\/|$)/, /^\/api\/lifeos(\/|$)/, /^\/projects(\/|$)/, /^\/clients(\/|$)/, /^\/api\/projects(\/|$)/, /^\/api\/clients(\/|$)/, /^\/api\/tasks(\/|$)/, /^\/api\/milestones(\/|$)/, /^\/api\/updates(\/|$)/, /^\/reference(\/|$)/, /^\/api\/reference(\/|$)/];
// Document routes don't live under a client-slug path (they're keyed by
// document id, not client), so they can't be gated by the slug-match check
// below. The route handlers do their own auth (team session OR a client
// session that owns the document's project), so middleware just lets these
// through on the portal domain rather than incorrectly redirecting them.
const PORTAL_API_PASSTHROUGH_PATHS = [/^\/api\/documents(\/|$)/];

function isAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth/")
  );
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isPortalDomain = host.startsWith("portal.");
  const { pathname } = request.nextUrl;

  if (isAsset(pathname)) {
    return NextResponse.next();
  }

  if (isPortalDomain) {
    if (pathname === "/") {
      // Root of the client-facing domain: send an already-logged-in client
      // straight to their own portal page, everyone else to the portal
      // login. This should never land on the internal team dashboard --
      // that's a different domain entirely.
      const existingToken = request.cookies.get(CLIENT_COOKIE)?.value;
      const existingSession = await verifySession(existingToken);
      if (existingSession && existingSession.kind === "client") {
        return NextResponse.redirect(new URL(`/${existingSession.slug}`, request.url));
      }
      return NextResponse.redirect(new URL("/portal-login", request.url));
    }

    if (INTERNAL_ONLY_PATHS.some((pattern) => pattern.test(pathname))) {
      return new NextResponse("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (PUBLIC_PORTAL_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    if (PORTAL_API_PASSTHROUGH_PATHS.some((pattern) => pattern.test(pathname))) {
      return NextResponse.next();
    }

    const token = request.cookies.get(CLIENT_COOKIE)?.value;
    const session = await verifySession(token);
    const clientSlug = pathname.slice(1).split("/")[0];

    if (!session || session.kind !== "client" || session.slug !== clientSlug) {
      const loginUrl = new URL("/portal-login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // Internal (launchpad.arandmedia.com and the vercel.app fallback domain)
  if (PUBLIC_INTERNAL_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TEAM_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session || session.kind !== "team") {
    // Send a brand-new deployment (zero users yet) to /setup instead of a
    // login page with nothing to log into. The setup route itself is the
    // source of truth on whether an account already exists, so this is
    // just a friendlier default landing spot, not a security decision.
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
