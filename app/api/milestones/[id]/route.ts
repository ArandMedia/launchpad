import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

// Marking a milestone complete here just flips completedAt -- it does NOT
// itself notify the client. Client-visible communication always goes
// through the Update model (POST via PATCH /api/projects/[id] with
// postUpdate), so there's exactly one place notifications can fire from.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json();
  const milestone = await db.milestone.update({
    where: { id: params.id },
    data: {
      ...(data.title ? { title: data.title } : {}),
      ...(data.targetDate !== undefined
        ? { targetDate: data.targetDate ? new Date(data.targetDate) : null }
        : {}),
      ...(data.completed !== undefined
        ? { completedAt: data.completed ? new Date() : null }
        : {}),
      ...(data.clientVisible !== undefined ? { clientVisible: data.clientVisible } : {}),
    },
  });

  return NextResponse.json({ milestone });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  await db.milestone.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
