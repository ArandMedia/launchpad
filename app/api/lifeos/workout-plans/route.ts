import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";
import { decryptWorkoutPlanPayload, encryptWorkoutPlanPayload } from "@/lib/lifeos-core";
import { validateWorkoutPlanPayload } from "@/lib/lifeos-exercises";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message = "Invalid workout plan") => NextResponse.json({ error: message }, { status: 400 });

function calendarDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function planBody(body: Record<string, unknown>) {
  const scheduledFor = calendarDate(body.scheduledFor);
  const plan = body.plan;
  return scheduledFor && validateWorkoutPlanPayload(plan) ? { scheduledFor, plan } : null;
}

export async function GET(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const from = calendarDate(req.nextUrl.searchParams.get("from"));
  const to = calendarDate(req.nextUrl.searchParams.get("to"));
  if (!from || !to || to < from || to.valueOf() - from.valueOf() > 31 * 86_400_000) return invalid("Choose a valid plan range of 31 days or less.");
  const records = await db.lifeOSWorkoutPlan.findMany({ where: { ownerId, scheduledFor: { gte: from, lte: to } }, orderBy: { scheduledFor: "asc" }, take: 50 });
  const plans = records.flatMap((record) => {
    try {
      return [{ id: record.id, scheduledFor: record.scheduledFor.toISOString().slice(0, 10), workoutId: record.workoutId, ...decryptWorkoutPlanPayload(record) }];
    } catch {
      return [];
    }
  });
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return invalid();
  const input = planBody(body);
  if (!input) return invalid("Add a date, title, and at least one valid exercise.");
  const existing = await db.lifeOSWorkoutPlan.findFirst({ where: { ownerId, scheduledFor: input.scheduledFor }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "A plan already exists for that day" }, { status: 409 });
  const encrypted = encryptWorkoutPlanPayload(input.plan);
  const record = await db.lifeOSWorkoutPlan.create({ data: { ownerId, scheduledFor: input.scheduledFor, ...encrypted } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "HEALTH", entityType: "WORKOUT_PLAN", entityId: record.id, action: "CREATED", summary: "Encrypted workout plan created" } });
  return NextResponse.json({ id: record.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.id !== "string") return invalid();
  const input = planBody(body);
  if (!input) return invalid("Add a date, title, and at least one valid exercise.");
  const encrypted = encryptWorkoutPlanPayload(input.plan);
  const updated = await db.lifeOSWorkoutPlan.updateMany({ where: { id: body.id, ownerId }, data: { scheduledFor: input.scheduledFor, ...encrypted } });
  if (!updated.count) return fail();
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "HEALTH", entityType: "WORKOUT_PLAN", entityId: body.id, action: "UPDATED", summary: "Encrypted workout plan updated" } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") return invalid();
  const record = await db.lifeOSWorkoutPlan.findFirst({ where: { id: body.id, ownerId }, select: { id: true } });
  if (!record) return fail();
  await db.lifeOSWorkoutPlan.deleteMany({ where: { id: record.id, ownerId } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "HEALTH", entityType: "WORKOUT_PLAN", entityId: record.id, action: "DELETED", summary: "Encrypted workout plan removed" } });
  return NextResponse.json({ ok: true });
}
