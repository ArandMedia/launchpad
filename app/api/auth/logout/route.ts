import { NextResponse } from "next/server";
import { TEAM_COOKIE, CLIENT_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TEAM_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(CLIENT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
