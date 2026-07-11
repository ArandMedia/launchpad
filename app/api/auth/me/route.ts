import { NextResponse } from "next/server";
import { getTeamSession, getClientSession } from "@/lib/current-session";

export async function GET() {
  const team = await getTeamSession();
  if (team) return NextResponse.json({ kind: "team", email: team.email, role: team.role });

  const client = await getClientSession();
  if (client) return NextResponse.json({ kind: "client", email: client.email, slug: client.slug });

  return NextResponse.json({ kind: null }, { status: 200 });
}
