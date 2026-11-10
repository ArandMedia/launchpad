import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";
import { decryptHealthPayload, encryptHealthPayload } from "@/lib/lifeos-core";
import { HEALTH_CHECK_IN_METRICS, isCalendarDate, validateHealthCheckIn, type HealthMetricKey } from "@/lib/lifeos-health";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function GET(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 90);
  const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 7), 3650) : 90;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const metrics = await db.lifeOSMetricDefinition.findMany({
    where: { ownerId, domainKey: "HEALTH", metricKey: { not: null } },
    orderBy: { name: "asc" },
  });
  const records = metrics.length ? await db.lifeOSHealthMeasurement.findMany({
    where: { ownerId, metricId: { in: metrics.map((metric) => metric.id) }, observedAt: { gte: since } },
    orderBy: { observedAt: "desc" },
    take: 10000,
  }) : [];
  const keyByMetric = new Map(metrics.map((metric) => [metric.id, metric.metricKey as HealthMetricKey]));
  const byDate = new Map<string, { date: string; values: Partial<Record<HealthMetricKey, number>>; note: string }>();
  for (const record of records) {
    const metricKey = keyByMetric.get(record.metricId);
    if (!metricKey) continue;
    try {
      const payload = decryptHealthPayload(record);
      const date = record.observedAt.toISOString().slice(0, 10);
      const entry = byDate.get(date) || { date, values: {}, note: "" };
      entry.values[metricKey] = payload.value;
      if (!entry.note && payload.note) entry.note = payload.note;
      byDate.set(date, entry);
    } catch {
      // A corrupt or differently keyed record is omitted instead of exposing ciphertext.
    }
  }
  return NextResponse.json({ days, entries: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)) });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || !isCalendarDate(body.date)) return invalid("A valid check-in date is required");
  const values = validateHealthCheckIn(body.values);
  if (!values) return invalid("Enter at least one valid health measurement");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const observedAt = new Date(`${body.date}T12:00:00.000Z`);
  const definitions = [];
  for (const [metricKey, value] of Object.entries(values) as Array<[HealthMetricKey, number]>) {
    const config = HEALTH_CHECK_IN_METRICS.find((metric) => metric.key === metricKey)!;
    const definition = await db.lifeOSMetricDefinition.upsert({
      where: { ownerId_metricKey: { ownerId, metricKey } },
      create: { ownerId, metricKey, domainKey: "HEALTH", name: config.name, unit: config.unit, direction: "NEUTRAL", sensitivity: "HEALTH" },
      update: { name: config.name, unit: config.unit, active: true, sensitivity: "HEALTH" },
    });
    definitions.push({ definition, value });
  }
  const structuredMetrics = await db.lifeOSMetricDefinition.findMany({
    where: { ownerId, metricKey: { in: HEALTH_CHECK_IN_METRICS.map((metric) => metric.key) } },
    select: { id: true },
  });
  await db.$transaction([
    db.lifeOSHealthMeasurement.deleteMany({ where: { ownerId, metricId: { in: structuredMetrics.map((metric) => metric.id) }, observedAt } }),
    ...definitions.map(({ definition, value }) => {
    const encrypted = encryptHealthPayload({ value, note });
    return db.lifeOSHealthMeasurement.create({ data: { ownerId, metricId: definition.id, observedAt, source: "MANUAL_AAR", ...encrypted } });
  })]);
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "HEALTH", entityType: "HEALTH_CHECK_IN", entityId: body.date, action: "RECORDED", summary: `Encrypted health check-in recorded for ${body.date}` } });
  return NextResponse.json({ ok: true, recorded: definitions.length }, { status: 201 });
}
