import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { sync, type VEvent } from "node-ical";

export type ExternalCalendarEvent = {
  id: string;
  feedId: string;
  calendarName: string;
  color: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string;
  description: string;
  eventUrl: string;
};

function privateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const value = mapped || normalized;
  if (isIP(value) !== 4) return false;
  const [a, b] = value.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function normalizePublicCalendarUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const candidate = value.trim().replace(/^webcal:/i, "https:");
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return null;
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || privateAddress(hostname)) return null;
  return url.toString();
}

async function assertPublicHostname(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("Calendar host is not public");
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeEventUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function overlaps(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  return start < rangeEnd && end > rangeStart;
}

function eventRecord(event: VEvent, feed: { id: string; name: string; color: string }, start: Date, end: Date, suffix = ""): ExternalCalendarEvent {
  return {
    id: `${feed.id}:${event.uid || "event"}:${suffix || start.toISOString()}`,
    feedId: feed.id,
    calendarName: feed.name,
    color: feed.color,
    title: text(event.summary, "Untitled event").slice(0, 300),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    allDay: event.datetype === "date",
    location: text(event.location).slice(0, 500),
    description: text(event.description).slice(0, 4000),
    eventUrl: safeEventUrl(event.url),
  };
}

function excluded(event: VEvent, occurrence: Date) {
  const exdates = event.exdate && typeof event.exdate === "object" ? Object.values(event.exdate) : [];
  return exdates.some((value) => value instanceof Date && value.valueOf() === occurrence.valueOf());
}

function recurrenceOverride(event: VEvent, occurrence: Date) {
  if (!event.recurrences) return null;
  const day = occurrence.toISOString().slice(0, 10);
  return Object.entries(event.recurrences).find(([key, value]) => {
    if (key.startsWith(day)) return true;
    const recurrenceId = value.recurrenceid;
    return recurrenceId instanceof Date && recurrenceId.valueOf() === occurrence.valueOf();
  })?.[1] ?? null;
}

export function parsePublicCalendar(ics: string, feed: { id: string; name: string; color: string }, rangeStart: Date, rangeEnd: Date) {
  if (!(rangeStart < rangeEnd)) throw new Error("Invalid calendar range");
  const parsed = sync.parseICS(ics);
  const result: ExternalCalendarEvent[] = [];

  for (const component of Object.values(parsed)) {
    if (component.type !== "VEVENT") continue;
    const event = component as VEvent;
    if (event.status === "CANCELLED" || !(event.start instanceof Date)) continue;
    const baseEnd = event.end instanceof Date ? event.end : new Date(event.start.valueOf() + 60 * 60 * 1000);
    const duration = Math.max(1, baseEnd.valueOf() - event.start.valueOf());

    if (event.rrule) {
      const occurrences = event.rrule.between(new Date(rangeStart.valueOf() - duration), rangeEnd, true);
      for (const occurrence of occurrences) {
        if (result.length >= 5000 || excluded(event, occurrence)) continue;
        const override = recurrenceOverride(event, occurrence);
        if (override?.status === "CANCELLED") continue;
        const start = override?.start instanceof Date ? override.start : occurrence;
        const end = override?.end instanceof Date ? override.end : new Date(start.valueOf() + duration);
        if (overlaps(start, end, rangeStart, rangeEnd)) {
          result.push(eventRecord((override ?? event) as VEvent, feed, start, end, occurrence.toISOString()));
        }
      }
      continue;
    }

    if (overlaps(event.start, baseEnd, rangeStart, rangeEnd)) result.push(eventRecord(event, feed, event.start, baseEnd));
  }

  return result.sort((left, right) => left.startAt.localeCompare(right.startAt));
}

export async function fetchPublicCalendar(value: string, signal?: AbortSignal): Promise<{ body: string; finalUrl: string }> {
  const normalized = normalizePublicCalendarUrl(value);
  if (!normalized) throw new Error("Enter a valid public calendar link");
  let current: string = normalized;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const requestUrl: URL = new URL(current);
    await assertPublicHostname(requestUrl.hostname);
    const response: Response = await fetch(requestUrl, {
      cache: "no-store",
      redirect: "manual",
      signal,
      headers: { Accept: "text/calendar, text/plain;q=0.9" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location: string | null = response.headers.get("location");
      const next: string | null = location ? normalizePublicCalendarUrl(new URL(location, requestUrl).toString()) : null;
      if (!next || redirect === 3) throw new Error("Calendar redirected to an unsupported address");
      current = next;
      continue;
    }
    if (!response.ok) throw new Error(`Calendar returned ${response.status}`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 5_000_000) throw new Error("Calendar feed is too large");
    const body = await response.text();
    if (body.length > 5_000_000 || !body.includes("BEGIN:VCALENDAR")) throw new Error("Link did not return a calendar feed");
    return { body, finalUrl: current };
  }
  throw new Error("Calendar could not be loaded");
}
