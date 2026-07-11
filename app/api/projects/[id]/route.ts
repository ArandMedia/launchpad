import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyClient } from "@/lib/notifications";
import { requireTeamSession } from "@/lib/require-auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      tasks: { orderBy: { createdAt: "asc" } },
      milestones: { orderBy: { targetDate: "asc" } },
      updates: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

// PATCH updates project status/details. If a client-visible update is
// posted, this is the single choke point that fires the notification —
// so internal edits and client comms never drift out of sync.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json();

  const project = await db.project.update({
    where: { id: params.id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.targetDate ? { targetDate: new Date(data.targetDate) } : {}),
    },
    include: { client: true },
  });

  if (data.postUpdate) {
    const update = await db.update.create({
      data: {
        body: data.postUpdate.body,
        clientVisible: !!data.postUpdate.clientVisible,
        projectId: project.id,
        authorId: data.postUpdate.authorId,
      },
    });

    if (update.clientVisible) {
      await notifyClient({
        projectId: project.id,
        recipientEmail: project.client.email,
        subject: `Update on ${project.name}`,
        body: update.body,
      });
    }
  }

  return NextResponse.json({ project });
}
