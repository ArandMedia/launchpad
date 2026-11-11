import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";
import { decryptHealthPayload, encryptHealthPayload, isDomainKey } from "@/lib/lifeos-core";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message = "Invalid request") => NextResponse.json({ error: message }, { status: 400 });
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function targetDate(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : undefined;
}

async function activity(ownerId: string, domainKey: string, entityType: string, entityId: string, action: string, summary: string) {
  await db.lifeOSActivity.create({ data: { ownerId, domainKey, entityType, entityId, action, summary } });
}

export async function GET() {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const [domains, goals, routines, actions, metrics, measurements, healthMeasurements, principles, commitments, integrations, reviewCycles, activities] = await Promise.all([
    db.lifeOSDomainState.findMany({ where: { ownerId }, orderBy: { domainKey: "asc" } }),
    db.lifeOSGoal.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSRoutine.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSAction.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSMetricDefinition.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSMeasurement.findMany({ where: { ownerId }, orderBy: { observedAt: "desc" }, take: 200 }),
    db.lifeOSHealthMeasurement.findMany({ where: { ownerId }, orderBy: { observedAt: "desc" }, take: 200 }),
    db.lifeOSPrinciple.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSRelationshipCommitment.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    db.lifeOSIntegrationConnection.findMany({ where: { ownerId }, orderBy: { providerKey: "asc" } }),
    db.lifeOSReviewCycle.findMany({ where: { ownerId }, orderBy: { periodStart: "desc" }, take: 100 }),
    db.lifeOSActivity.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const decryptedHealth = healthMeasurements.flatMap((record) => {
    try { return [{ ...record, ...decryptHealthPayload(record), ciphertext: undefined, iv: undefined, authTag: undefined }]; }
    catch { return []; }
  });
  return NextResponse.json({ domains, goals, routines, actions, metrics, measurements, healthMeasurements: decryptedHealth, principles, commitments, integrations, reviewCycles, activities });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return invalid("Invalid JSON");

  if (body.kind === "domain-state") {
    if (!isDomainKey(body.domainKey)) return invalid("Invalid domain");
    const fields = ["currentState", "desiredState", "gap", "activeSystem", "nextActions", "evidence"] as const;
    const data = Object.fromEntries(fields.map((key) => [key, text(body[key], 6000)]));
    const record = await db.lifeOSDomainState.upsert({
      where: { ownerId_domainKey: { ownerId, domainKey: body.domainKey } },
      create: { ownerId, domainKey: body.domainKey, ...data }, update: data,
    });
    await activity(ownerId, body.domainKey, "DOMAIN_STATE", record.id, "UPDATED", `${body.domainKey} operating state updated`);
    return NextResponse.json({ record });
  }

  if (body.kind === "routine") {
    if (!isDomainKey(body.domainKey)) return invalid("Invalid domain");
    const title = text(body.title, 180); const cadence = text(body.cadence, 40) || "WEEKLY";
    if (!title) return invalid("Routine title required");
    const record = await db.lifeOSRoutine.create({ data: { ownerId, domainKey: body.domainKey, title, cadence, notes: text(body.notes, 1000) } });
    await activity(ownerId, body.domainKey, "ROUTINE", record.id, "CREATED", title);
    return NextResponse.json({ record }, { status: 201 });
  }

  if (body.kind === "action") {
    if (!isDomainKey(body.domainKey)) return invalid("Invalid domain");
    const title = text(body.title, 180); if (!title) return invalid("Action title required");
    const record = await db.lifeOSAction.create({ data: { ownerId, domainKey: body.domainKey, title } });
    await activity(ownerId, body.domainKey, "ACTION", record.id, "CREATED", title);
    return NextResponse.json({ record }, { status: 201 });
  }

  if (body.kind === "metric") {
    if (!isDomainKey(body.domainKey)) return invalid("Invalid domain");
    const name = text(body.name, 120); if (!name) return invalid("Metric name required");
    const sensitivity = body.domainKey === "HEALTH" ? "HEALTH" : "STANDARD";
    const record = await db.lifeOSMetricDefinition.create({ data: { ownerId, domainKey: body.domainKey, name, unit: text(body.unit, 40), direction: ["HIGHER", "LOWER", "NEUTRAL"].includes(body.direction) ? body.direction : "NEUTRAL", sensitivity } });
    await activity(ownerId, body.domainKey, "METRIC", record.id, "CREATED", name);
    return NextResponse.json({ record }, { status: 201 });
  }

  if (body.kind === "measurement") {
    const metric = typeof body.metricId === "string" ? await db.lifeOSMetricDefinition.findFirst({ where: { id: body.metricId, ownerId } }) : null;
    const value = Number(body.value); const observedAt = new Date(body.observedAt);
    if (!metric || !Number.isFinite(value) || Number.isNaN(observedAt.valueOf())) return invalid("Invalid measurement");
    const note = text(body.note, 1000);
    if (metric.domainKey === "HEALTH") {
      const encrypted = encryptHealthPayload({ value, note });
      const record = await db.lifeOSHealthMeasurement.create({ data: { ownerId, metricId: metric.id, observedAt, ...encrypted } });
      await activity(ownerId, "HEALTH", "HEALTH_MEASUREMENT", record.id, "RECORDED", `${metric.name} manual reading recorded`);
      return NextResponse.json({ record: { id: record.id } }, { status: 201 });
    }
    const record = await db.lifeOSMeasurement.create({ data: { ownerId, metricId: metric.id, value, note, observedAt } });
    await activity(ownerId, metric.domainKey, "MEASUREMENT", record.id, "RECORDED", `${metric.name} evidence recorded`);
    return NextResponse.json({ record }, { status: 201 });
  }

  if (body.kind === "principle") {
    if (!isDomainKey(body.domainKey) || !["SELF", "OMNIS"].includes(body.domainKey)) return invalid("Invalid principle domain");
    const title = text(body.title, 180); if (!title) return invalid("Principle title required");
    const record = await db.lifeOSPrinciple.create({ data: { ownerId, domainKey: body.domainKey, title, statement: text(body.statement, 3000) } });
    await activity(ownerId, body.domainKey, "PRINCIPLE", record.id, "CREATED", title);
    return NextResponse.json({ record }, { status: 201 });
  }

  if (body.kind === "commitment") {
    const title = text(body.title, 180); const area = text(body.area, 60);
    if (!title || !area) return invalid("Commitment title and area required");
    const record = await db.lifeOSRelationshipCommitment.create({ data: { ownerId, title, area, cadence: text(body.cadence, 60), note: text(body.note, 2000) } });
    await activity(ownerId, "RELATIONSHIPS", "COMMITMENT", record.id, "CREATED", title);
    return NextResponse.json({ record }, { status: 201 });
  }

  if (body.kind === "review-cycle") {
    const period = ["WEEKLY", "MONTHLY", "QUARTERLY"].includes(body.period) ? body.period : null;
    const periodStart = new Date(`${body.periodStart}T12:00:00.000Z`);
    if (!period || Number.isNaN(periodStart.valueOf()) || (body.domainKey && !isDomainKey(body.domainKey))) return invalid("Invalid review cycle");
    const record = await db.lifeOSReviewCycle.create({ data: { ownerId, period, periodStart, domainKey: body.domainKey || null, observation: text(body.observation, 5000), recommendation: text(body.recommendation, 5000), decision: text(body.decision, 5000) } });
    await activity(ownerId, body.domainKey || "OMNIS", "REVIEW", record.id, "CREATED", `${period.toLowerCase()} review recorded`);
    return NextResponse.json({ record }, { status: 201 });
  }

  return invalid("Unsupported action");
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner(); if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") return invalid("Invalid update");
  if (body.kind === "goal-update") {
    const title = text(body.title, 180);
    const due = targetDate(body.targetDate);
    if (!title || typeof body.done !== "boolean" || due === undefined) return invalid("Invalid outcome");
    const updated = await db.lifeOSGoal.updateMany({
      where: { id: body.id, ownerId },
      data: { title, targetDate: due, done: body.done, completedAt: body.done ? new Date() : null },
    });
    if (!updated.count) return fail();
    await activity(ownerId, isDomainKey(body.domainKey) ? body.domainKey : "OMNIS", "GOAL", body.id, "UPDATED", body.done ? `${title} completed` : `${title} updated`);
    return NextResponse.json({ ok: true });
  }
  if (body.kind === "routine-update") {
    const title = text(body.title, 180);
    const cadence = ["DAILY", "WEEKLY", "MONTHLY"].includes(body.cadence) ? body.cadence : null;
    if (!title || !cadence || typeof body.active !== "boolean") return invalid("Invalid routine");
    const updated = await db.lifeOSRoutine.updateMany({
      where: { id: body.id, ownerId },
      data: { title, cadence, notes: text(body.notes, 1000), active: body.active },
    });
    if (!updated.count) return fail();
    await activity(ownerId, isDomainKey(body.domainKey) ? body.domainKey : "OMNIS", "ROUTINE", body.id, "UPDATED", `${title} updated`);
    return NextResponse.json({ ok: true });
  }
  if (body.kind === "action-update") {
    const title = text(body.title, 180);
    const status = ["OPEN", "DONE", "SKIPPED"].includes(body.status) ? body.status : null;
    if (!title || !status) return invalid("Invalid action");
    const updated = await db.lifeOSAction.updateMany({ where: { id: body.id, ownerId }, data: { title, status } });
    if (!updated.count) return fail();
    await activity(ownerId, isDomainKey(body.domainKey) ? body.domainKey : "OMNIS", "ACTION", body.id, "UPDATED", `${title} updated`);
    return NextResponse.json({ ok: true });
  }
  if (body.kind === "routine-status") {
    const updated = await db.lifeOSRoutine.updateMany({ where: { id: body.id, ownerId }, data: { active: Boolean(body.active) } });
    if (!updated.count) return fail();
    await activity(ownerId, isDomainKey(body.domainKey) ? body.domainKey : "OMNIS", "ROUTINE", body.id, "STATUS_CHANGED", body.active ? "Routine activated" : "Routine paused");
    return NextResponse.json({ ok: true });
  }
  if (body.kind === "action-status") {
    const status = ["OPEN", "DONE", "SKIPPED"].includes(body.status) ? body.status : null;
    if (!status) return invalid("Invalid action status");
    const updated = await db.lifeOSAction.updateMany({ where: { id: body.id, ownerId }, data: { status } });
    if (!updated.count) return fail();
    await activity(ownerId, isDomainKey(body.domainKey) ? body.domainKey : "OMNIS", "ACTION", body.id, "STATUS_CHANGED", `Action ${status.toLowerCase()}`);
    return NextResponse.json({ ok: true });
  }
  if (body.kind === "integration-disconnect") {
    const providerKey = text(body.providerKey, 60);
    const updated = await db.lifeOSIntegrationConnection.updateMany({
      where: { ownerId, providerKey, status: "CONNECTED" },
      data: { status: "DISCONNECTED", scopes: [], disconnectedAt: new Date() },
    });
    if (!updated.count) return fail();
    await activity(ownerId, isDomainKey(body.domainKey) ? body.domainKey : "OMNIS", "INTEGRATION", providerKey, "DISCONNECTED", `${providerKey} disconnected`);
    return NextResponse.json({ ok: true });
  }
  return invalid("Unsupported update");
}

export async function DELETE(req: NextRequest) {
  const ownerId = await lifeOSOwner(); if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  const providerKey = text(body?.providerKey, 60);
  if (!providerKey) return invalid("Provider required");
  const connection = await db.lifeOSIntegrationConnection.findFirst({ where: { ownerId, providerKey } });
  if (!connection) return fail();
  const [healthEvidence, standardEvidence, integration] = await db.$transaction([
    db.lifeOSHealthMeasurement.deleteMany({ where: { ownerId, source: providerKey } }),
    db.lifeOSMeasurement.deleteMany({ where: { ownerId, source: providerKey } }),
    db.lifeOSIntegrationConnection.deleteMany({ where: { ownerId, providerKey } }),
  ]);
  await activity(ownerId, connection.domainKey, "INTEGRATION", providerKey, "DELETED", `${providerKey} connection and imported evidence deleted`);
  return NextResponse.json({ ok: true, deletedEvidence: healthEvidence.count + standardEvidence.count, deletedConnections: integration.count });
}
