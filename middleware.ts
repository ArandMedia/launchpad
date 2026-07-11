import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Two domains point at this one deployment:
//   launchpad.arandmedia.com -> internal team dashboard ("/", "/projects/[id]")
//   portal.arandmedia.com    -> client portal only ("/[clientSlug]")
//
// This middleware keeps the internal dashboard and project detail pages
// (and the write-capable /api/projects routes) unreachable from the
// client-facing portal domain, and sends anyone who lands on the portal
// domain's bare root back to the internal domain instead of exposing
// team data there.
const INTERNAL_ONLY_PATHS = [/^\/projects(\/|$)/, /^\/api\/projects(\/|$)/];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isPortalDomain = host.startsWith("portal.");

  if (!isPortalDomain) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("https://launchpad.arandmedia.com/"));
  }

  if (INTERNAL_ONLY_PATHS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
