import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message = "Invalid entry") => NextResponse.json({ error: message }, { status: 400 });
const kinds = ["JOURNAL", "NOTE"] as const;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function tags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, 40).toLowerCase()).filter(Boolean))].slice(0, 20);
}

function occurredOn(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function payload(body: Record<string, unknown>) {
  const kind = kinds.includes(body.kind as (typeof kinds)[number]) ? body.kind as (typeof kinds)[number] : null;
  const title = text(body.title, 180);
  const bodyText = text(body.body, 50_000);
  const date = occurredOn(body.occurredOn);
  const inkData = typeof body.inkData === "string" && body.inkData.length <= 1_000_000 ? body.inkData : "";
  if (!kind || !title || !date) return null;
  if (inkData) {
    try { JSON.parse(inkData); } catch { return null; }
  }
  return { kind, title, body: bodyText, tags: tags(body.tags), inkData, occurredOn: date };
}

export async function GET(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const query = text(req.nextUrl.searchParams.get("q"), 120);
  const requestedKind = req.nextUrl.searchParams.get("kind");
  const kind = kinds.includes(requestedKind as (typeof kinds)[number]) ? requestedKind : null;
  const entries = await db.lifeOSJournalEntry.findMany({
    where: {
      ownerId,
      ...(kind ? { kind } : {}),
      ...(query ? { OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { body: { contains: query, mode: "insensitive" as const } },
        { tags: { has: query.toLowerCase() } },
      ] } : {}),
    },
    orderBy: [{ occurredOn: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return invalid();
  const data = payload(body);
  if (!data) return invalid();
  const entry = await db.lifeOSJournalEntry.create({ data: { ownerId, ...data } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "SELF", entityType: "JOURNAL_ENTRY", entityId: entry.id, action: "CREATED", summary: `${data.kind.toLowerCase()} entry created` } });
  return NextResponse.json({ entry }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.id !== "string") return invalid();
  const data = payload(body);
  if (!data) return invalid();
  const updated = await db.lifeOSJournalEntry.updateMany({ where: { id: body.id, ownerId }, data });
  if (!updated.count) return fail();
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "SELF", entityType: "JOURNAL_ENTRY", entityId: body.id, action: "UPDATED", summary: `${data.kind.toLowerCase()} entry updated` } });
  return NextResponse.json({ ok: true });
}
