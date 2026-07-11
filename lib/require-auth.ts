import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/current-session";
import type { TeamSession } from "@/lib/session";

// Defense in depth: middleware already blocks unauthenticated page loads,
// but every mutating API route re-checks the session itself so nothing
// mutates data if it's ever hit directly (curl, a misconfigured matcher,
// a future route that forgets to update the middleware matcher, etc).
export async function requireTeamSession(): Promise<
  { session: TeamSession } | { error: NextResponse }
> {
  const session = await getTeamSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  return { session };
}
