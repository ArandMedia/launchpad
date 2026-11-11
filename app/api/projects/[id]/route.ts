import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { notifyClient } from "@/lib/notifications";
import { requireTeamSession } from "@/lib/require-auth";

const projectStatuses = ["DISCOVERY", "IN_PROGRESS", "REVIEW", "BLOCKED", "COMPLETE"] as const;
const invalid = (error: string) => NextResponse.json({ error }, { status: 400 });

function calendarDate(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : undefined;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
// Also handles archiving: `archived: true/false` sets/clears archivedAt.
// Archived projects stay fully intact (tasks, milestones, updates, docs)
// and stay visible on the client's portal -- they just drop out of the
// default internal project list.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return invalid("Enter valid project details");

  const name = data.name === undefined ? undefined : typeof data.name === "string" ? data.name.trim() : "";
  if (name !== undefined && (!name || name.length > 200)) return invalid("Enter a project name of 200 characters or less");
  if (data.status !== undefined && !projectStatuses.includes(data.status)) return invalid("Choose a valid project status");
  const startDate = data.startDate === undefined ? undefined : calendarDate(data.startDate);
  const targetDate = data.targetDate === undefined ? undefined : calendarDate(data.targetDate);
  if (data.startDate !== undefined && startDate === undefined) return invalid("Choose a valid start date");
  if (data.targetDate !== undefined && targetDate === undefined) return invalid("Choose a valid target date");

  const project = await db.project.update({
    where: { id: params.id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.problem !== undefined ? { problem: data.problem || null } : {}),
      ...(data.solution !== undefined ? { solution: data.solution || null } : {}),
      ...(data.desiredOutcome !== undefined ? { desiredOutcome: data.desiredOutcome || null } : {}),
      ...(startDate !== undefined ? { startDate } : {}),
      ...(targetDate !== undefined ? { targetDate } : {}),
      ...(data.archived !== undefined ? { archivedAt: data.archived ? new Date() : null } : {}),
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

// Permanently deletes a project and everything scoped to it (tasks,
// milestones, updates, documents -- including their blob files). This is
// the destructive option; archiving (PATCH { archived: true }) is the
// reversible one and should be reached for first.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const project = await db.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const documents = await db.document.findMany({ where: { projectId: params.id } });
  await Promise.all(
    documents.map((doc) =>
      del(doc.url).catch(() => {
        // Same reasoning as the single-document delete route: an orphaned
        // blob is a minor cost, not worth blocking the project delete over.
      })
    )
  );

  await db.$transaction([
    db.document.deleteMany({ where: { projectId: params.id } }),
    db.update.deleteMany({ where: { projectId: params.id } }),
    db.milestone.deleteMany({ where: { projectId: params.id } }),
    db.task.deleteMany({ where: { projectId: params.id } }),
    db.notificationLog.deleteMany({ where: { projectId: params.id } }),
    db.project.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
