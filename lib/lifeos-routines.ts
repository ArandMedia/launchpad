import { addLocal, chicagoLocalToUtc, floorLocal, parseLocalInput, utcToChicagoInput } from "@/lib/lifeos-time";

export type ScheduledRoutine = {
  id: string;
  title: string;
  domainKey: string;
  cadence: string;
  active: boolean;
  notes: string;
  objectiveId: string | null;
  objectiveTitle: string;
  scheduleTime: string;
  scheduleDurationMinutes: number;
  scheduleWeekdays: number[];
  scheduleDayOfMonth: number | null;
  scheduleStartsOn: string | null;
};

export type RoutineOccurrence = {
  id: string;
  routineId: string;
  title: string;
  domainKey: string;
  cadence: string;
  notes: string;
  objectiveTitle: string;
  startAt: string;
  endAt: string;
};

const MAX_OCCURRENCES = 2000;

function dateOnly(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function matches(routine: ScheduledRoutine, day: string) {
  const parts = parseLocalInput(`${day}T00:00`);
  if (!parts) return false;
  if (routine.cadence === "DAILY") return true;
  if (routine.cadence === "WEEKLY") {
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    return routine.scheduleWeekdays.includes(weekday);
  }
  return routine.cadence === "MONTHLY" && routine.scheduleDayOfMonth === parts.day;
}

export function routineOccurrences(routines: ScheduledRoutine[], rangeStart: Date, rangeEnd: Date) {
  if (!(rangeStart < rangeEnd)) return [];
  const results: RoutineOccurrence[] = [];
  let localDay = floorLocal(utcToChicagoInput(rangeStart), "DAY");
  const localEnd = utcToChicagoInput(rangeEnd);

  while (localDay < localEnd && results.length < MAX_OCCURRENCES) {
    const day = localDay.slice(0, 10);
    for (const routine of routines) {
      if (results.length >= MAX_OCCURRENCES) break;
      if (!routine.active || !/^([01]\d|2[0-3]):[0-5]\d$/.test(routine.scheduleTime)) continue;
      if (dateOnly(routine.scheduleStartsOn) > day || !matches(routine, day)) continue;
      const startAt = chicagoLocalToUtc(`${day}T${routine.scheduleTime}`);
      if (!startAt) continue;
      const endAt = new Date(new Date(startAt).valueOf() + routine.scheduleDurationMinutes * 60_000).toISOString();
      if (new Date(startAt) >= rangeEnd || new Date(endAt) <= rangeStart) continue;
      results.push({
        id: `routine:${routine.id}:${day}`,
        routineId: routine.id,
        title: routine.title,
        domainKey: routine.domainKey,
        cadence: routine.cadence,
        notes: routine.notes,
        objectiveTitle: routine.objectiveTitle,
        startAt,
        endAt,
      });
    }
    localDay = addLocal(localDay, "day", 1);
  }
  return results.sort((left, right) => left.startAt.localeCompare(right.startAt));
}
