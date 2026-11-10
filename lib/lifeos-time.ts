export const LIFEOS_TIME_ZONE = "America/Chicago";

export type CalendarLevel = "LIFE" | "PHASE" | "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR";

export const CALENDAR_LEVELS: CalendarLevel[] = [
  "LIFE",
  "PHASE",
  "YEAR",
  "QUARTER",
  "MONTH",
  "WEEK",
  "DAY",
  "HOUR",
];

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

const zonedFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LIFEOS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseLocalInput(value: string): LocalParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) return null;
  return { year, month, day, hour, minute };
}

function partsForInstant(date: Date): LocalParts {
  const values = Object.fromEntries(
    zonedFormatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
  );
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute };
}

function partsToInput(parts: LocalParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function utcToChicagoInput(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return partsToInput(partsForInstant(date));
}

export function chicagoLocalToUtc(value: string): string | null {
  const parts = parseLocalInput(value);
  if (!parts) return null;
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let candidate = wallClock;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shown = partsForInstant(new Date(candidate));
    const shownClock = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute);
    candidate += wallClock - shownClock;
  }
  const result = new Date(candidate);
  return partsToInput(partsForInstant(result)) === value ? result.toISOString() : null;
}

export function nowInChicago(date = new Date()) {
  return utcToChicagoInput(date);
}

export function addLocal(value: string, unit: "year" | "month" | "day" | "hour" | "minute", amount: number) {
  const parts = parseLocalInput(value);
  if (!parts) return value;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  if (unit === "year") date.setUTCFullYear(date.getUTCFullYear() + amount);
  if (unit === "month") date.setUTCMonth(date.getUTCMonth() + amount);
  if (unit === "day") date.setUTCDate(date.getUTCDate() + amount);
  if (unit === "hour") date.setUTCHours(date.getUTCHours() + amount);
  if (unit === "minute") date.setUTCMinutes(date.getUTCMinutes() + amount);
  return partsToInput({
    year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(),
    hour: date.getUTCHours(), minute: date.getUTCMinutes(),
  });
}

export function floorLocal(value: string, level: CalendarLevel) {
  const parts = parseLocalInput(value) ?? parseLocalInput(nowInChicago())!;
  if (level === "LIFE") return `${Math.floor((parts.year - 20) / 10) * 10}-01-01T00:00`;
  if (level === "PHASE") return `${Math.floor(parts.year / 10) * 10}-01-01T00:00`;
  if (level === "YEAR") return `${parts.year}-01-01T00:00`;
  if (level === "QUARTER") return `${parts.year}-${pad(Math.floor((parts.month - 1) / 3) * 3 + 1)}-01T00:00`;
  if (level === "MONTH") return `${parts.year}-${pad(parts.month)}-01T00:00`;
  if (level === "WEEK") {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T00:00`;
  }
  if (level === "DAY") return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T00:00`;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:00`;
}

export function periodEnd(level: CalendarLevel, start: string) {
  if (level === "LIFE") return addLocal(start, "year", 80);
  if (level === "PHASE") return addLocal(start, "year", 10);
  if (level === "YEAR") return addLocal(start, "year", 1);
  if (level === "QUARTER") return addLocal(start, "month", 3);
  if (level === "MONTH") return addLocal(start, "month", 1);
  if (level === "WEEK") return addLocal(start, "day", 7);
  if (level === "DAY") return addLocal(start, "day", 1);
  return addLocal(start, "hour", 1);
}

export function shiftPeriod(level: CalendarLevel, start: string, amount: number) {
  if (level === "LIFE") return addLocal(start, "year", amount * 80);
  if (level === "PHASE") return addLocal(start, "year", amount * 10);
  if (level === "YEAR") return addLocal(start, "year", amount);
  if (level === "QUARTER") return addLocal(start, "month", amount * 3);
  if (level === "MONTH") return addLocal(start, "month", amount);
  if (level === "WEEK") return addLocal(start, "day", amount * 7);
  if (level === "DAY") return addLocal(start, "day", amount);
  return addLocal(start, "hour", amount);
}

export type CalendarTile = { start: string; end: string; label: string; nextLevel: CalendarLevel | null };

function localDisplay(value: string, options: Intl.DateTimeFormatOptions) {
  const parts = parseLocalInput(value)!;
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute))
  );
}

export function periodLabel(level: CalendarLevel, start: string) {
  const parts = parseLocalInput(start)!;
  const end = periodEnd(level, start);
  if (level === "LIFE") return `${parts.year}–${parseLocalInput(end)!.year - 1} life canvas`;
  if (level === "PHASE") return `${parts.year}–${parseLocalInput(end)!.year - 1} phase`;
  if (level === "YEAR") return String(parts.year);
  if (level === "QUARTER") return `Q${Math.floor((parts.month - 1) / 3) + 1} ${parts.year}`;
  if (level === "MONTH") return localDisplay(start, { month: "long", year: "numeric" });
  if (level === "WEEK") return `Week of ${localDisplay(start, { month: "short", day: "numeric", year: "numeric" })}`;
  if (level === "DAY") return localDisplay(start, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return localDisplay(start, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function calendarTiles(level: CalendarLevel, periodStart: string): CalendarTile[] {
  const tile = (start: string, end: string, label: string, nextLevel: CalendarLevel | null): CalendarTile =>
    ({ start, end, label, nextLevel });
  if (level === "LIFE") {
    return Array.from({ length: 8 }, (_, index) => {
      const start = addLocal(periodStart, "year", index * 10);
      return tile(start, addLocal(start, "year", 10), periodLabel("PHASE", start), "PHASE");
    });
  }
  if (level === "PHASE") {
    return Array.from({ length: 10 }, (_, index) => {
      const start = addLocal(periodStart, "year", index);
      return tile(start, addLocal(start, "year", 1), String(parseLocalInput(start)!.year), "YEAR");
    });
  }
  if (level === "YEAR") {
    return Array.from({ length: 4 }, (_, index) => {
      const start = addLocal(periodStart, "month", index * 3);
      return tile(start, addLocal(start, "month", 3), `Q${index + 1}`, "QUARTER");
    });
  }
  if (level === "QUARTER") {
    return Array.from({ length: 3 }, (_, index) => {
      const start = addLocal(periodStart, "month", index);
      return tile(start, addLocal(start, "month", 1), localDisplay(start, { month: "long" }), "MONTH");
    });
  }
  if (level === "MONTH") {
    const monthEnd = periodEnd("MONTH", periodStart);
    let start = floorLocal(periodStart, "WEEK");
    const result: CalendarTile[] = [];
    while (start < monthEnd && result.length < 6) {
      const end = addLocal(start, "day", 7);
      result.push(tile(start, end, `Week of ${localDisplay(start, { month: "short", day: "numeric" })}`, "WEEK"));
      start = end;
    }
    return result;
  }
  if (level === "WEEK") {
    return Array.from({ length: 7 }, (_, index) => {
      const start = addLocal(periodStart, "day", index);
      return tile(start, addLocal(start, "day", 1), localDisplay(start, { weekday: "short", month: "short", day: "numeric" }), "DAY");
    });
  }
  if (level === "DAY") {
    return Array.from({ length: 24 }, (_, index) => {
      const start = addLocal(periodStart, "hour", index);
      return tile(start, addLocal(start, "hour", 1), localDisplay(start, { hour: "numeric" }), "HOUR");
    });
  }
  return Array.from({ length: 4 }, (_, index) => {
    const start = addLocal(periodStart, "minute", index * 15);
    return tile(start, addLocal(start, "minute", 15), localDisplay(start, { hour: "numeric", minute: "2-digit" }), null);
  });
}

export function localRangeToUtc(start: string, end: string) {
  const startUtc = chicagoLocalToUtc(start);
  const endUtc = chicagoLocalToUtc(end);
  return startUtc && endUtc ? { start: new Date(startUtc), end: new Date(endUtc) } : null;
}
