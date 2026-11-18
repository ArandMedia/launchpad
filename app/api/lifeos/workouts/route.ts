import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";
import { decryptWorkoutPayload, encryptWorkoutPayload } from "@/lib/lifeos-core";
import {
  estimateWorkoutCalories,
  isWorkoutActivityKey,
  isWorkoutIntensity,
  workoutActivityLabel,
  workoutMet,
  type WorkoutPayload,
} from "@/lib/lifeos-workouts";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message = "Invalid workout") => NextResponse.json({ error: message }, { status: 400 });

function workoutInput(body: Record<string, unknown>) {
  if (!isWorkoutActivityKey(body.activityKey) || !isWorkoutIntensity(body.intensity)) return null;
  const performedAt = new Date(typeof body.performedAt === "string" ? body.performedAt : "");
  const durationMinutes = Number(body.durationMinutes);
  const bodyWeightLbs = Number(body.bodyWeightLbs);
  const manualCalories = body.manualCalories === "" || body.manualCalories === null || body.manualCalories === undefined ? null : Number(body.manualCalories);
  if (Number.isNaN(performedAt.valueOf()) || performedAt.getFullYear() < 1900 || performedAt.valueOf() > Date.now() + 86_400_000) return null;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return null;
  if (!Number.isFinite(bodyWeightLbs) || bodyWeightLbs < 40 || bodyWeightLbs > 1000) return null;
  if (manualCalories !== null && (!Number.isInteger(manualCalories) || manualCalories < 1 || manualCalories > 20000)) return null;
  const activityLabel = workoutActivityLabel(body.activityKey, typeof body.customActivity === "string" ? body.customActivity : "");
  const met = workoutMet(body.activityKey, body.intensity);
  const estimatedCalories = estimateWorkoutCalories(met, bodyWeightLbs, durationMinutes);
  const payload: WorkoutPayload = {
    activityKey: body.activityKey,
    activityLabel,
    intensity: body.intensity,
    durationMinutes,
    bodyWeightLbs: Math.round(bodyWeightLbs * 10) / 10,
    met,
    estimatedCalories,
    caloriesBurned: manualCalories ?? estimatedCalories,
    calorieSource: manualCalories === null ? "ESTIMATED" : "MANUAL",
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "",
  };
  return { occurredAt: performedAt, payload };
}

export async function GET(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 365);
  const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 30), 3650) : 365;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const records = await db.lifeOSWorkout.findMany({
    where: { ownerId, occurredAt: { gte: since } },
    orderBy: { occurredAt: "desc" },
    take: 2000,
  });
  const workouts = records.flatMap((record) => {
    try {
      return [{ id: record.id, occurredAt: record.occurredAt.toISOString(), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), ...decryptWorkoutPayload(record) }];
    } catch {
      return [];
    }
  });
  return NextResponse.json({ days, workouts });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return invalid();
  const input = workoutInput(body);
  if (!input) return invalid("Enter a valid workout time, duration, body weight, activity, and calorie value.");
  const encrypted = encryptWorkoutPayload(input.payload);
  const workout = await db.lifeOSWorkout.create({ data: { ownerId, occurredAt: input.occurredAt, ...encrypted } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "HEALTH", entityType: "WORKOUT", entityId: workout.id, action: "RECORDED", summary: "Encrypted workout recorded" } });
  return NextResponse.json({ id: workout.id, occurredAt: workout.occurredAt.toISOString(), ...input.payload }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.id !== "string") return invalid();
  const input = workoutInput(body);
  if (!input) return invalid("Enter a valid workout time, duration, body weight, activity, and calorie value.");
  const encrypted = encryptWorkoutPayload(input.payload);
  const updated = await db.lifeOSWorkout.updateMany({ where: { id: body.id, ownerId }, data: { occurredAt: input.occurredAt, ...encrypted } });
  if (!updated.count) return fail();
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "HEALTH", entityType: "WORKOUT", entityId: body.id, action: "UPDATED", summary: "Encrypted workout updated" } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") return invalid();
  const workout = await db.lifeOSWorkout.findFirst({ where: { id: body.id, ownerId }, select: { id: true } });
  if (!workout) return fail();
  await db.lifeOSWorkout.deleteMany({ where: { id: workout.id, ownerId } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "HEALTH", entityType: "WORKOUT", entityId: workout.id, action: "DELETED", summary: "Encrypted workout removed" } });
  return NextResponse.json({ ok: true });
}
