import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";
import { BLOCK_STATUSES } from "@/lib/lifeos-blocks";
import { isDomainKey } from "@/lib/lifeos-domains";

const horizons = ["LIFETIME", "PHASE", "YEAR", "SPRINT", "MONTH", "WEEK", "DAY", "HOUR"] as const;
const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });

function scheduleFrom(body: Record<string, unknown>) {
  const startValue = body.startAt;
  const endValue = body.endAt;
  if ((startValue === null || startValue === "" || startValue === undefined) &&
      (endValue === null || endValue === "" || endValue === undefined)) {
    return { startAt: null, endAt: null };
  }
  if (typeof startValue !== "string" || typeof endValue !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(startValue) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(endValue)) return null;
  const startAt = new Date(startValue);
  const endAt = new Date(endValue);
  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf()) || startAt >= endAt) return null;
  return { startAt, endAt };
}

export async function GET() {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const [goals, reviews, blocks] = await Promise.all([
    db.lifeOSGoal.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSReview.findMany({ where: { ownerId }, orderBy: { date: "desc" }, take: 30 }),
    db.lifeOSTimeBlock.findMany({ where: { ownerId }, orderBy: { startAt: "asc" } }),
  ]);
  return NextResponse.json({ goals, reviews, blocks });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (body.kind === "goal") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 180 || !horizons.includes(body.horizon))
      return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
    const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;
    if (parentId && !(await db.lifeOSGoal.findFirst({ where: { id: parentId, ownerId } })))
      return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
    const schedule = scheduleFrom(body);
    if (!schedule) return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    const domainKey = isDomainKey(body.domainKey) ? body.domainKey : "OMNIS";
    const targetValue = body.targetValue === null || body.targetValue === undefined || body.targetValue === "" ? null : Number(body.targetValue);
    if (targetValue !== null && !Number.isFinite(targetValue)) return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    const targetUnit = typeof body.targetUnit === "string" ? body.targetUnit.trim().slice(0, 40) : "";
    const goal = await db.lifeOSGoal.create({ data: { ownerId, title, horizon: body.horizon, parentId, domainKey, targetValue, targetUnit, ...schedule } });
    return NextResponse.json({ goal }, { status: 201 });
  }
  if (body.kind === "review") {
    if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    const answers = [body.intended, body.actual, body.learned, body.next].map((value) =>
      typeof value === "string" ? value.trim() : ""
    );
    if (answers.some((value) => value.length > 4000))
      return NextResponse.json({ error: "Review too long" }, { status: 400 });
    const date = new Date(body.date + "T12:00:00.000Z");
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0,10) !== body.date)
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    const review = await db.lifeOSReview.upsert({
      where: { ownerId_date: { ownerId, date } },
      create: { ownerId, date, intended: answers[0], actual: answers[1], learned: answers[2], next: answers[3] },
      update: { intended: answers[0], actual: answers[1], learned: answers[2], next: answers[3] },
    });
    return NextResponse.json({ review });
  }
  if (body.kind === "block") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const objectiveId = typeof body.objectiveId === "string" && body.objectiveId ? body.objectiveId : null;
    const schedule = scheduleFrom(body);
    if (!title || title.length > 180 || note.length > 1000 || category.length > 60 || !schedule?.startAt || !schedule.endAt)
      return NextResponse.json({ error: "Invalid time block" }, { status: 400 });
    if (!BLOCK_STATUSES.includes(body.status))
      return NextResponse.json({ error: "Invalid block status" }, { status: 400 });
    if (objectiveId && !(await db.lifeOSGoal.findFirst({ where: { id: objectiveId, ownerId } })))
      return NextResponse.json({ error: "Invalid objective" }, { status: 400 });
    const block = await db.lifeOSTimeBlock.create({
      data: { ownerId, title, note, category, objectiveId, status: body.status, startAt: schedule.startAt, endAt: schedule.endAt },
    });
    return NextResponse.json({ block }, { status: 201 });
  }
  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string")
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  if (body.action === "schedule") {
    const schedule = scheduleFrom(body);
    if (!schedule) return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    const updated = await db.lifeOSGoal.updateMany({ where: { id: body.id, ownerId }, data: schedule });
    if (!updated.count) return fail();
    return NextResponse.json({ ok: true });
  }
  if (body.action === "block") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const objectiveId = typeof body.objectiveId === "string" && body.objectiveId ? body.objectiveId : null;
    const schedule = scheduleFrom(body);
    if (!title || title.length > 180 || note.length > 1000 || category.length > 60 || !schedule?.startAt || !schedule.endAt || !BLOCK_STATUSES.includes(body.status))
      return NextResponse.json({ error: "Invalid time block" }, { status: 400 });
    if (objectiveId && !(await db.lifeOSGoal.findFirst({ where: { id: objectiveId, ownerId } })))
      return NextResponse.json({ error: "Invalid objective" }, { status: 400 });
    const updated = await db.lifeOSTimeBlock.updateMany({
      where: { id: body.id, ownerId },
      data: { title, note, category, objectiveId, status: body.status, startAt: schedule.startAt, endAt: schedule.endAt },
    });
    if (!updated.count) return fail();
    return NextResponse.json({ ok: true });
  }
  if (body.action === "block-status") {
    if (!BLOCK_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid block status" }, { status: 400 });
    const updated = await db.lifeOSTimeBlock.updateMany({ where: { id: body.id, ownerId }, data: { status: body.status } });
    if (!updated.count) return fail();
    return NextResponse.json({ ok: true });
  }
  if (typeof body.done !== "boolean") return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  const updated = await db.lifeOSGoal.updateMany({
    where: { id: body.id, ownerId },
    data: { done: body.done, completedAt: body.done ? new Date() : null },
  });
  if (!updated.count) return fail();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string")
    return NextResponse.json({ error: "Invalid delete" }, { status: 400 });
  const deleted = await db.lifeOSTimeBlock.deleteMany({ where: { id: body.id, ownerId } });
  if (!deleted.count) return fail();
  return NextResponse.json({ ok: true });
}
