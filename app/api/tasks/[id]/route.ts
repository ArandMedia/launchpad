import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json();
  const task = await db.task.update({
    where: { id: params.id },
    data: {
      ...(data.title ? { title: data.title } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
    },
  });

  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  await db.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
