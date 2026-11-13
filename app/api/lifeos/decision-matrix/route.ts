import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  currentDecisionDate,
  decisionItemKey,
  isDecisionQuadrant,
  isDecisionSourceKind,
  parseDecisionDate,
  type DecisionSourceKind,
} from "@/lib/decision-matrix";
import { lifeOSOwner } from "@/lib/lifeos-auth";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message = "Invalid request") => NextResponse.json({ error: message }, { status: 400 });

type SourceSnapshot = {
  sourceKind: DecisionSourceKind;
  sourceId: string;
  title: string;
  context: string;
  dueAt: Date | null;
};

type MatrixResponseItem = SourceSnapshot & {
  createdAt: Date;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  quadrant: string | null;
};

async function sourceSnapshot(ownerId: string, sourceKind: DecisionSourceKind, sourceId: string): Promise<SourceSnapshot | null> {
  const projectWhere = { archivedAt: null, status: { not: "COMPLETE" as const } };
  if (sourceKind === "PROJECT_TASK") {
    const item = await db.task.findFirst({
      where: { id: sourceId, status: { not: "DONE" }, project: projectWhere },
      include: { project: { include: { client: true } } },
    });
    return item ? {
      sourceKind,
      sourceId: item.id,
      title: item.title,
      context: `${item.project.client.companyName || item.project.client.name} · ${item.project.name}`,
      dueAt: item.dueDate,
    } : null;
  }
  if (sourceKind === "MILESTONE") {
    const item = await db.milestone.findFirst({
      where: { id: sourceId, completedAt: null, project: projectWhere },
      include: { project: { include: { client: true } } },
    });
    return item ? {
      sourceKind,
      sourceId: item.id,
      title: item.title,
      context: `${item.project.client.companyName || item.project.client.name} · ${item.project.name} · milestone`,
      dueAt: item.targetDate,
    } : null;
  }
  const item = await db.lifeOSAction.findFirst({ where: { id: sourceId, ownerId, status: "OPEN" } });
  return item ? {
    sourceKind,
    sourceId: item.id,
    title: item.title,
    context: `${item.domainKey.toLowerCase().replaceAll("_", " ")} · next action`,
    dueAt: item.dueAt,
  } : null;
}

export async function GET(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const dateValue = req.nextUrl.searchParams.get("date") || currentDecisionDate();
  const date = parseDecisionDate(dateValue);
  if (!date) return invalid("Invalid date");

  const projectWhere = { archivedAt: null, status: { not: "COMPLETE" as const } };
  const [tasks, milestones, actions, placements] = await Promise.all([
    db.task.findMany({
      where: { status: { not: "DONE" }, project: projectWhere },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: { project: { include: { client: true } } },
    }),
    db.milestone.findMany({
      where: { completedAt: null, project: projectWhere },
      orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: { project: { include: { client: true } } },
    }),
    db.lifeOSAction.findMany({
      where: { ownerId, status: "OPEN" },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    }),
    db.lifeOSDecisionPlacement.findMany({ where: { ownerId, date }, orderBy: { updatedAt: "asc" } }),
  ]);

  const placementBySource = new Map(placements.map((item) => [decisionItemKey(item.sourceKind as DecisionSourceKind, item.sourceId), item]));
  const items: MatrixResponseItem[] = [
    ...tasks.map((item) => ({
      sourceKind: "PROJECT_TASK" as const,
      sourceId: item.id,
      title: item.title,
      context: `${item.project.client.companyName || item.project.client.name} · ${item.project.name}`,
      dueAt: item.dueDate,
      createdAt: item.createdAt,
      projectId: item.project.id,
      projectName: item.project.name,
      clientId: item.project.client.id,
      clientName: item.project.client.companyName || item.project.client.name,
    })),
    ...milestones.map((item) => ({
      sourceKind: "MILESTONE" as const,
      sourceId: item.id,
      title: item.title,
      context: `${item.project.client.companyName || item.project.client.name} · ${item.project.name} · milestone`,
      dueAt: item.targetDate,
      createdAt: item.createdAt,
      projectId: item.project.id,
      projectName: item.project.name,
      clientId: item.project.client.id,
      clientName: item.project.client.companyName || item.project.client.name,
    })),
    ...actions.map((item) => ({
      sourceKind: "NEXT_ACTION" as const,
      sourceId: item.id,
      title: item.title,
      context: `${item.domainKey.toLowerCase().replaceAll("_", " ")} · next action`,
      dueAt: item.dueAt,
      createdAt: item.createdAt,
      projectId: null,
      projectName: null,
      clientId: null,
      clientName: null,
    })),
  ].map((item) => ({
    ...item,
    quadrant: placementBySource.get(decisionItemKey(item.sourceKind, item.sourceId))?.quadrant ?? null,
  }));

  const liveKeys = new Set(items.map((item) => decisionItemKey(item.sourceKind, item.sourceId)));
  for (const placement of placements) {
    const sourceKind = placement.sourceKind as DecisionSourceKind;
    if (!isDecisionSourceKind(sourceKind) || liveKeys.has(decisionItemKey(sourceKind, placement.sourceId))) continue;
    items.push({
      sourceKind,
      sourceId: placement.sourceId,
      title: placement.titleSnapshot,
      context: placement.contextSnapshot,
      dueAt: placement.dueAtSnapshot,
      createdAt: placement.createdAt,
      projectId: null,
      projectName: null,
      clientId: null,
      clientName: null,
      quadrant: placement.quadrant,
    });
  }

  return NextResponse.json({ date: dateValue, items });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || !isDecisionSourceKind(body.sourceKind) || typeof body.sourceId !== "string") return invalid();
  const date = parseDecisionDate(body.date);
  if (!date || (body.quadrant !== null && !isDecisionQuadrant(body.quadrant))) return invalid();

  const key = { ownerId, date, sourceKind: body.sourceKind, sourceId: body.sourceId };
  if (body.quadrant === null) {
    await db.lifeOSDecisionPlacement.deleteMany({ where: key });
    return NextResponse.json({ ok: true });
  }

  const existing = await db.lifeOSDecisionPlacement.findUnique({
    where: { ownerId_date_sourceKind_sourceId: key },
  });
  if (existing) {
    await db.lifeOSDecisionPlacement.update({ where: { id: existing.id }, data: { quadrant: body.quadrant } });
    return NextResponse.json({ ok: true });
  }

  const source = await sourceSnapshot(ownerId, body.sourceKind, body.sourceId);
  if (!source) return fail();
  await db.lifeOSDecisionPlacement.create({
    data: {
      ...key,
      titleSnapshot: source.title,
      contextSnapshot: source.context,
      dueAtSnapshot: source.dueAt,
      quadrant: body.quadrant,
    },
  });
  return NextResponse.json({ ok: true });
}
