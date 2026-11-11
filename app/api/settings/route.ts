import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeamSession } from "@/lib/current-session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { SESSION_MAX_AGE, signSession, TEAM_COOKIE } from "@/lib/session";
import { landingPages, parseUserPreferences, type LandingPage } from "@/lib/user-preferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (error: string) => NextResponse.json({ error }, { status: 400 });

async function currentUser() {
  const session = await getTeamSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  return user ? { session, user } : null;
}

export async function GET() {
  const current = await currentUser();
  if (!current) return fail();
  const canUseCalendar = isLifeOSOwner(current.session);
  return NextResponse.json({
    account: { name: current.user.name, email: current.user.email, role: current.user.role },
    preferences: parseUserPreferences(current.user.preferences, canUseCalendar),
    capabilities: { calendar: canUseCalendar },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(req: NextRequest) {
  const current = await currentUser();
  if (!current) return fail();
  const body = await req.json().catch(() => null);

  if (body?.kind === "preferences") {
    const defaultLanding = body.defaultLanding as LandingPage;
    if (!landingPages.includes(defaultLanding)) return invalid("Choose a valid landing page");
    if (defaultLanding === "CALENDAR" && !isLifeOSOwner(current.session)) return invalid("Calendar is not available for this account");
    const existing = current.user.preferences && typeof current.user.preferences === "object" && !Array.isArray(current.user.preferences)
      ? current.user.preferences as Record<string, unknown>
      : {};
    await db.user.update({ where: { id: current.user.id }, data: { preferences: { ...existing, defaultLanding } } });
    return NextResponse.json({ preferences: { defaultLanding } });
  }

  if (body?.kind === "profile") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!name || name.length > 100) return invalid("Enter a name of 100 characters or less");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return invalid("Enter a valid email address");
    try {
      const user = await db.user.update({ where: { id: current.user.id }, data: { name, email } });
      const token = await signSession({ kind: "team", userId: user.id, email: user.email, role: user.role });
      const response = NextResponse.json({ account: { name: user.name, email: user.email, role: user.role } });
      response.cookies.set(TEAM_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
      return response;
    } catch {
      return invalid("That email address is already in use");
    }
  }

  if (body?.kind === "password") {
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!(await verifyPassword(currentPassword, current.user.passwordHash))) return invalid("Current password is incorrect");
    if (newPassword.length < 8 || newPassword.length > 200) return invalid("Use a password between 8 and 200 characters");
    await db.user.update({ where: { id: current.user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    return NextResponse.json({ ok: true });
  }

  return invalid("Choose a settings section to update");
}
