import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeOSOwner } from "@/lib/lifeos-auth";
import { decryptCalendarFeedUrl, encryptCalendarFeedUrl } from "@/lib/lifeos-core";
import { fetchPublicCalendar, normalizePublicCalendarUrl, parsePublicCalendar, type ExternalCalendarEvent } from "@/lib/calendar-feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (error: string) => NextResponse.json({ error }, { status: 400 });
const colorPattern = /^#[0-9a-f]{6}$/i;

function safeFeed(feed: { id: string; name: string; color: string; active: boolean; lastSyncedAt: Date | null; lastError: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: feed.id,
    name: feed.name,
    color: feed.color,
    active: feed.active,
    lastSyncedAt: feed.lastSyncedAt,
    lastError: feed.lastError,
    createdAt: feed.createdAt,
    updatedAt: feed.updatedAt,
  };
}

function requestedRange(req: NextRequest) {
  const now = new Date();
  // Keep the no-argument window inside the same three-year cap enforced below.
  const defaultStart = new Date(now.valueOf() - 365 * 86_400_000);
  const defaultEnd = new Date(now.valueOf() + 730 * 86_400_000);
  const start = new Date(req.nextUrl.searchParams.get("start") || defaultStart.toISOString());
  const end = new Date(req.nextUrl.searchParams.get("end") || defaultEnd.toISOString());
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start >= end || end.valueOf() - start.valueOf() > 3 * 366 * 86_400_000) return null;
  return { start, end };
}

export async function GET(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const range = requestedRange(req);
  if (!range) return invalid("Choose a calendar range of three years or less");
  const feeds = await db.lifeOSCalendarFeed.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } });
  const events: ExternalCalendarEvent[] = [];

  await Promise.all(feeds.filter((feed) => feed.active).map(async (feed) => {
    try {
      const url = decryptCalendarFeedUrl(feed);
      const loaded = await fetchPublicCalendar(url, AbortSignal.timeout(10_000));
      events.push(...parsePublicCalendar(loaded.body, feed, range.start, range.end));
      feed.lastSyncedAt = new Date();
      feed.lastError = "";
      await db.lifeOSCalendarFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: feed.lastSyncedAt, lastError: "" } });
    } catch (caught) {
      feed.lastError = caught instanceof Error ? caught.message.slice(0, 300) : "Unable to refresh calendar";
      await db.lifeOSCalendarFeed.update({ where: { id: feed.id }, data: { lastError: feed.lastError } }).catch(() => undefined);
    }
  }));

  return NextResponse.json({ feeds: feeds.map(safeFeed), events: events.sort((left, right) => left.startAt.localeCompare(right.startAt)) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = typeof body?.color === "string" ? body.color.toLowerCase() : "";
  const normalized = normalizePublicCalendarUrl(body?.url);
  if (!name || name.length > 80) return invalid("Add a calendar label of 80 characters or less");
  if (!colorPattern.test(color)) return invalid("Choose a valid calendar color");
  if (!normalized) return invalid("Enter a public HTTPS or webcal calendar link");

  const existing = await db.lifeOSCalendarFeed.findMany({ where: { ownerId } });
  const duplicate = existing.some((feed) => {
    try { return decryptCalendarFeedUrl(feed) === normalized; } catch { return false; }
  });
  if (duplicate) return invalid("That calendar link is already connected");

  let loaded: Awaited<ReturnType<typeof fetchPublicCalendar>>;
  try {
    loaded = await fetchPublicCalendar(normalized, AbortSignal.timeout(10_000));
    parsePublicCalendar(loaded.body, { id: "validation", name, color }, new Date(Date.now() - 86_400_000), new Date(Date.now() + 366 * 86_400_000));
  } catch (caught) {
    return invalid(caught instanceof Error ? caught.message : "Unable to load that calendar");
  }

  const encrypted = encryptCalendarFeedUrl(loaded.finalUrl);
  const feed = await db.lifeOSCalendarFeed.create({
    data: { ownerId, name, color, lastSyncedAt: new Date(), ...encrypted },
  });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "OMNIS", entityType: "CALENDAR_FEED", entityId: feed.id, action: "CONNECTED", summary: `Read-only calendar connected: ${name}` } });
  return NextResponse.json({ feed: safeFeed(feed) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = typeof body?.color === "string" ? body.color.toLowerCase() : "";
  if (!id || !name || name.length > 80 || !colorPattern.test(color)) return invalid("Enter a valid label and color");
  const updated = await db.lifeOSCalendarFeed.updateMany({ where: { id, ownerId }, data: { name, color } });
  if (!updated.count) return fail();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return invalid("Choose a calendar to remove");
  const feed = await db.lifeOSCalendarFeed.findFirst({ where: { id, ownerId }, select: { name: true } });
  if (!feed) return fail();
  await db.lifeOSCalendarFeed.deleteMany({ where: { id, ownerId } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: "OMNIS", entityType: "CALENDAR_FEED", entityId: id, action: "DISCONNECTED", summary: `Read-only calendar removed: ${feed.name}` } });
  return NextResponse.json({ ok: true });
}
