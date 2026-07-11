import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { signSession, CLIENT_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const client = await db.client.findUnique({ where: { email } });
  if (!client || !client.passwordHash || !(await verifyPassword(password, client.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signSession({
    kind: "client",
    clientId: client.id,
    slug: client.slug,
    email: client.email,
  });

  const res = NextResponse.json({ ok: true, slug: client.slug });
  res.cookies.set(CLIENT_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
