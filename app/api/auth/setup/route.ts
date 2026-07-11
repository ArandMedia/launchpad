import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { signSession, TEAM_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

// One-time bootstrap: creates the first ADMIN user. Locked once any user
// exists, so this can never be used to add a second account -- after the
// first admin is set up, new team members must be added directly in the
// database (or a future "invite" flow) rather than through this endpoint.
export async function POST(req: NextRequest) {
  const existingCount = await db.user.count();
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "Setup already completed. Use /login instead." },
      { status: 403 }
    );
  }

  const data = await req.json();
  const { name, email, password } = data;

  if (!name || !email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "name, email, and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
  });

  const token = await signSession({
    kind: "team",
    userId: user.id,
    email: user.email,
    role: "ADMIN",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TEAM_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
