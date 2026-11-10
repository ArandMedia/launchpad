"use client";

import { useMemo, useState } from "react";
import {
  CALENDAR_LEVELS,
  LIFEOS_TIME_ZONE,
  calendarTiles,
  chicagoLocalToUtc,
  floorLocal,
  localRangeToUtc,
  nowInChicago,
  periodEnd,
  periodLabel,
  shiftPeriod,
  type CalendarLevel,
  type CalendarTile,
} from "@/lib/lifeos-time";

export type CalendarGoal = {
  id: string;
  title: string;
  horizon: string;
  done: boolean;
  startAt: string | null;
  endAt: string | null;
};

type Props = {
  goals: CalendarGoal[];
  onEditGoal: (goal: CalendarGoal) => void;
};

function overlapping(goals: CalendarGoal[], tile: CalendarTile) {
  const range = localRangeToUtc(tile.start, tile.end);
  if (!range) return [];
  return goals.filter((goal) => {
    if (!goal.startAt || !goal.endAt) return false;
    return new Date(goal.startAt) < range.end && new Date(goal.endAt) > range.start;
  });
}

function monthDays(tile: CalendarTile) {
  const days: { label: string; start: string }[] = [];
  let cursor = tile.start;
  for (let index = 0; index < 7; index += 1) {
    const value = new Date(chicagoLocalToUtc(cursor)!);
    days.push({
      start: cursor,
      label: new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, weekday: "short", day: "numeric" }).format(value),
    });
    cursor = calendarTiles("WEEK", tile.start)[index]?.end ?? cursor;
  }
  return days;
}

export default function SemanticCalendar({ goals, onEditGoal }: Props) {
  const [level, setLevel] = useState<CalendarLevel>("LIFE");
  const [cursor, setCursor] = useState(() => nowInChicago());
  const nowLocal = nowInChicago();
  const periodStart = floorLocal(cursor, level);
  const end = periodEnd(level, periodStart);
  const tiles = useMemo(() => calendarTiles(level, periodStart), [level, periodStart]);
  const scheduled = goals.filter((goal) => goal.startAt && goal.endAt);
  const unscheduledCount = goals.length - scheduled.length;
  const periodUtc = localRangeToUtc(periodStart, end);
  const visibleGoals = periodUtc
    ? scheduled.filter((goal) => new Date(goal.startAt!) < periodUtc.end && new Date(goal.endAt!) > periodUtc.start)
    : [];
  const levelIndex = CALENDAR_LEVELS.indexOf(level);

  function chooseTile(tile: CalendarTile) {
    setCursor(tile.start);
    if (tile.nextLevel) setLevel(tile.nextLevel);
  }

  function zoom(delta: number) {
    const next = CALENDAR_LEVELS[Math.max(0, Math.min(CALENDAR_LEVELS.length - 1, levelIndex + delta))];
    setLevel(next);
  }

  const control = "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-40";

  return (
    <section id="timeline" aria-labelledby="calendar-heading" className="scroll-mt-20 min-w-0 rounded-2xl border border-teal-800 bg-slate-900 p-4 sm:p-6 lg:col-span-2">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Semantic time map</p>
          <h2 id="calendar-heading" className="mt-1 text-xl font-semibold">LifeOS Timeline</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">Zoom from the span of your life’s work into phases, calendar periods, days, and individual hours. All times use {LIFEOS_TIME_ZONE}.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Calendar zoom controls">
          <button type="button" className={control} disabled={levelIndex === 0} onClick={() => zoom(-1)} aria-label="Zoom out one time level">− Zoom out</button>
          <button type="button" className={control} disabled={levelIndex === CALENDAR_LEVELS.length - 1} onClick={() => zoom(1)} aria-label="Zoom in one time level">+ Zoom in</button>
        </div>
      </div>

      <nav className="mt-5 flex flex-wrap items-center gap-1 text-sm" aria-label="Calendar zoom breadcrumb">
        {CALENDAR_LEVELS.slice(0, levelIndex + 1).map((item, index) => (
          <span key={item} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true" className="text-slate-600">/</span>}
            <button type="button" onClick={() => setLevel(item)} aria-current={item === level ? "page" : undefined} className="min-h-11 rounded-md px-2 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
              {item === "LIFE" ? "Life" : item === "PHASE" ? "Phase" : item.charAt(0) + item.slice(1).toLowerCase()}
            </button>
          </span>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
        <div className="flex gap-2">
          <button type="button" className={control} onClick={() => setCursor(shiftPeriod(level, periodStart, -1))} aria-label={`Previous ${level.toLowerCase()}`}>←</button>
          <button type="button" className={control} onClick={() => setCursor(nowInChicago())}>Today</button>
          <button type="button" className={control} onClick={() => setCursor(shiftPeriod(level, periodStart, 1))} aria-label={`Next ${level.toLowerCase()}`}>→</button>
        </div>
        <h3 className="text-right font-semibold text-slate-100">{periodLabel(level, periodStart)}</h3>
      </div>

      {(level === "LIFE" || level === "PHASE" || level === "YEAR") && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3" aria-label="Scheduled objective spans">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Goal spans</p>
          {visibleGoals.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No scheduled objectives cross this span yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleGoals.map((goal) => {
                const startMs = periodUtc!.start.valueOf();
                const total = periodUtc!.end.valueOf() - startMs;
                const left = Math.max(0, (new Date(goal.startAt!).valueOf() - startMs) / total * 100);
                const right = Math.min(100, (new Date(goal.endAt!).valueOf() - startMs) / total * 100);
                return (
                  <button key={goal.id} type="button" onClick={() => onEditGoal(goal)} className="relative block min-h-11 w-full overflow-hidden rounded-lg bg-slate-800 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300" aria-label={`Edit schedule for ${goal.title}`}>
                    <span className="absolute inset-y-0 rounded-md bg-teal-500/35" style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%` }} />
                    <span className="relative z-10 block truncate px-3 py-3 text-sm font-medium">{goal.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className={`mt-4 grid gap-2 ${level === "WEEK" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7" : level === "DAY" ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : level === "HOUR" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`} aria-label={`${level.toLowerCase()} time regions`}>
        {tiles.map((tile) => {
          const tileGoals = overlapping(scheduled, tile);
          const current = tile.start <= nowLocal && nowLocal < tile.end;
          return (
            <button key={tile.start} type="button" onClick={() => chooseTile(tile)} className={`min-h-16 touch-manipulation rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${current ? "border-teal-300 bg-teal-950/50" : "border-slate-700 bg-slate-950/50 hover:border-slate-500 hover:bg-slate-800"}`} aria-label={`${tile.label}${current ? ", current period" : ""}${tile.nextLevel ? `, drill into ${tile.nextLevel.toLowerCase()}` : ""}`}>
              <span className="flex items-start justify-between gap-2">
                <span className="font-semibold">{tile.label}</span>
                {current && <span className="rounded-full bg-teal-300 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-950">Current</span>}
              </span>
              {level === "MONTH" && <span className="mt-2 grid grid-cols-7 gap-1 text-[10px] text-slate-400">{monthDays(tile).map((day) => <span key={day.start}>{day.label}</span>)}</span>}
              {tileGoals.slice(0, 3).map((goal) => <span key={goal.id} className="mt-2 block truncate rounded bg-teal-400/15 px-2 py-1 text-xs text-teal-100">{goal.title}</span>)}
              {tileGoals.length > 3 && <span className="mt-1 block text-xs text-slate-400">+{tileGoals.length - 3} more</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
        <span>{visibleGoals.length} scheduled in view</span>
        <span aria-hidden="true">•</span>
        <span>{unscheduledCount} unscheduled objective{unscheduledCount === 1 ? "" : "s"}</span>
      </div>
    </section>
  );
}
