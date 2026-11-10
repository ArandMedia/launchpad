import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json();
  if (!data.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = await db.task.create({
    data: {
      title: data.title,
      status: data.status || "TODO",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: params.id,
      assigneeId: data.assigneeId || undefined,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
