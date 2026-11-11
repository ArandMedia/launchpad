import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET() {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();

  const scheduledWhere = {
    ownerId,
    status: { notIn: ["COMPLETED", "SKIPPED"] },
  };
  const projectWhere = { archivedAt: null, status: { not: "COMPLETE" as const } };
  const [tasks, milestones] = await Promise.all([
    db.task.findMany({
      where: { status: { not: "DONE" }, project: projectWhere },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        project: { include: { client: true } },
        timeBlocks: { where: scheduledWhere, orderBy: { startAt: "asc" }, select: { id: true, startAt: true, endAt: true, status: true } },
      },
    }),
    db.milestone.findMany({
      where: { completedAt: null, project: projectWhere },
      orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        project: { include: { client: true } },
        timeBlocks: { where: scheduledWhere, orderBy: { startAt: "asc" }, select: { id: true, startAt: true, endAt: true, status: true } },
      },
    }),
  ]);

  const items = [
    ...tasks.map((value) => ({
      kind: "TASK" as const,
      id: value.id,
      title: value.title,
      projectId: value.projectId,
      projectName: value.project.name,
      clientName: value.project.client.companyName || value.project.client.name,
      dueAt: value.dueDate,
      scheduledBlocks: value.timeBlocks,
    })),
    ...milestones.map((value) => ({
      kind: "MILESTONE" as const,
      id: value.id,
      title: value.title,
      projectId: value.projectId,
      projectName: value.project.name,
      clientName: value.project.client.companyName || value.project.client.name,
      dueAt: value.targetDate,
      scheduledBlocks: value.timeBlocks,
    })),
  ].sort((left, right) => {
    const leftScheduled = left.scheduledBlocks.length > 0 ? 1 : 0;
    const rightScheduled = right.scheduledBlocks.length > 0 ? 1 : 0;
    if (leftScheduled !== rightScheduled) return leftScheduled - rightScheduled;
    if (left.dueAt && right.dueAt) return left.dueAt.valueOf() - right.dueAt.valueOf();
    if (left.dueAt) return -1;
    if (right.dueAt) return 1;
    return left.projectName.localeCompare(right.projectName) || left.title.localeCompare(right.title);
  });

  return NextResponse.json({ items });
}
