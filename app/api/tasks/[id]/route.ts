import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
