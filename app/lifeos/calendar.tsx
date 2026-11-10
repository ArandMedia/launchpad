"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  parseLocalInput,
  shiftPeriod,
  utcToChicagoInput,
  type CalendarLevel,
  type CalendarTile,
} from "@/lib/lifeos-time";
import { agendaFor, positionOverlappingBlocks, type BlockStatus, type TimeBlock } from "@/lib/lifeos-blocks";

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
  blocks: TimeBlock[];
  onEditGoal: (goal: CalendarGoal) => void;
  onCreateBlock: (startLocal: string, endLocal: string) => void;
  onEditBlock: (block: TimeBlock) => void;
  onStatusBlock: (block: TimeBlock, status: BlockStatus) => void;
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

export default function SemanticCalendar({ goals, blocks, onEditGoal, onCreateBlock, onEditBlock, onStatusBlock }: Props) {
  const [level, setLevel] = useState<CalendarLevel>("DAY");
  const [cursor, setCursor] = useState(() => nowInChicago());
  const [clock, setClock] = useState(() => new Date());
  const timelineRef = useRef<HTMLDivElement>(null);
  const nowLocal = nowInChicago(clock);
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
  const isToday = floorLocal(nowLocal, "DAY") === floorLocal(periodStart, "DAY");
  const currentParts = parseLocalInput(nowLocal)!;
  const currentMinutes = currentParts.hour * 60 + currentParts.minute;
  const dayGoals = level === "DAY"
    ? [...visibleGoals].sort((left, right) => new Date(left.startAt!).valueOf() - new Date(right.startAt!).valueOf())
    : [];
  const dayBlocks = level === "DAY" && periodUtc
    ? blocks.filter((block) => new Date(block.startAt) < periodUtc.end && new Date(block.endAt) > periodUtc.start)
    : [];
  const { happeningNow, upNext, remaining } = agendaFor(dayBlocks, clock, isToday);
  const positionedBlocks = positionOverlappingBlocks(dayBlocks);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (level !== "DAY" || !isToday || !timelineRef.current) return;
    const timeline = timelineRef.current;
    timeline.scrollTop = Math.max(0, currentMinutes * 0.8 - timeline.clientHeight * 0.32);
  }, [currentMinutes, isToday, level, periodStart]);

  function chooseTile(tile: CalendarTile) {
    setCursor(tile.start);
    if (tile.nextLevel) setLevel(tile.nextLevel);
  }

  function zoom(delta: number) {
    const next = CALENDAR_LEVELS[Math.max(0, Math.min(CALENDAR_LEVELS.length - 1, levelIndex + delta))];
    setLevel(next);
  }

  const control = "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-40";

  function timeLabel(value: string) {
    return new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(value));
  }

  function minutesIntoSelectedDay(value: string, endBoundary = false) {
    const local = utcToChicagoInput(value);
    const selectedDate = periodStart.slice(0, 10);
    const localDate = local.slice(0, 10);
    if (localDate < selectedDate) return 0;
    if (localDate > selectedDate) return 1440;
    const parts = parseLocalInput(local)!;
    const minutes = parts.hour * 60 + parts.minute;
    return endBoundary && minutes === 0 && localDate !== selectedDate ? 1440 : minutes;
  }

  function emptySlot(event: React.MouseEvent<HTMLDivElement>) {
    if (level !== "DAY") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = Math.max(0, Math.min(1425, (event.clientY - rect.top) / 0.8));
    const minutes = Math.round(rawMinutes / 15) * 15;
    const date = periodStart.slice(0, 10);
    const format = (total: number) => `${date}T${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    onCreateBlock(format(minutes), format(Math.min(1439, minutes + 60)));
  }

  function statusLabel(status: BlockStatus) {
    return status.replace("_", " ").toLowerCase();
  }

  return (
    <section id="timeline" aria-labelledby="calendar-heading" className="lifeos-timeline scroll-mt-24 min-w-0 rounded-2xl border border-teal-800 bg-slate-900 p-4 sm:p-5 xl:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Semantic time map</p>
          <h2 id="calendar-heading" className="mt-1 text-xl font-semibold">LifeOS Timeline</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Today opens as your working agenda. Zoom out to the span of your life’s work or into individual hours. All times use {LIFEOS_TIME_ZONE}.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Calendar zoom controls">
          <button type="button" className={control} disabled={levelIndex === 0} onClick={() => zoom(-1)} aria-label="Zoom out one time level">− Zoom out</button>
          <button type="button" className={control} disabled={levelIndex === CALENDAR_LEVELS.length - 1} onClick={() => zoom(1)} aria-label="Zoom in one time level">+ Zoom in</button>
        </div>
      </div>

      <nav className="lifeos-breadcrumb mt-4 flex flex-wrap items-center gap-1 text-sm" aria-label="Calendar zoom breadcrumb">
        {CALENDAR_LEVELS.slice(0, levelIndex + 1).map((item, index) => (
          <span key={item} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true" className="text-slate-600">/</span>}
            <button type="button" onClick={() => setLevel(item)} aria-current={item === level ? "page" : undefined} className="min-h-11 rounded-md px-2 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
              {item === "LIFE" ? "Life" : item === "PHASE" ? "Phase" : item.charAt(0) + item.slice(1).toLowerCase()}
            </button>
          </span>
        ))}
      </nav>

      <div className="lifeos-period-controls mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
        <div className="flex gap-2">
          <button type="button" className={control} onClick={() => setCursor(shiftPeriod(level, periodStart, -1))} aria-label={`Previous ${level.toLowerCase()}`}>←</button>
          <button type="button" className={control} onClick={() => setCursor(nowInChicago())}>Today</button>
          <button type="button" className={control} onClick={() => setCursor(shiftPeriod(level, periodStart, 1))} aria-label={`Next ${level.toLowerCase()}`}>→</button>
        </div>
        <h3 className="text-right font-semibold text-slate-100">{periodLabel(level, periodStart)}</h3>
      </div>

      {level === "DAY" && (
        <div className="lifeos-day-layout mt-4">
          <aside className="lifeos-agenda rounded-xl border border-slate-700 bg-slate-950/60 p-4" aria-labelledby="agenda-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">{isToday ? `Today at ${timeLabel(clock.toISOString())}` : "Selected day"}</p>
                <h4 id="agenda-heading" className="mt-1 text-lg font-semibold">Agenda & up next</h4>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{dayBlocks.length} block{dayBlocks.length === 1 ? "" : "s"}</span>
            </div>

            {dayBlocks.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-600 p-4">
                <p className="font-semibold">Your day is open.</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Tap an open time on the timeline or use the button below. You can link the block to an objective without changing the objective’s planning span.</p>
                <button type="button" onClick={() => onCreateBlock(`${periodStart.slice(0, 10)}T09:00`, `${periodStart.slice(0, 10)}T10:00`)} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-teal-400 px-4 py-2 font-semibold text-slate-950 hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">Add a time block</button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <section aria-labelledby="now-heading">
                  <h5 id="now-heading" className="text-sm font-semibold text-slate-300">Happening now</h5>
                  {happeningNow.length ? happeningNow.map((block) => (
                    <button key={block.id} type="button" onClick={() => onEditBlock(block)} className="mt-2 block min-h-11 w-full rounded-lg border border-teal-500 bg-teal-950/50 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
                      <span className="block font-semibold">{block.title}</span>
                      <span className="mt-1 block text-sm text-teal-200">{timeLabel(block.startAt)}–{timeLabel(block.endAt)} · {statusLabel(block.status)}</span>
                    </button>
                  )) : <p className="mt-2 text-sm text-slate-500">No active block right now.</p>}
                </section>

                <section aria-labelledby="next-heading">
                  <h5 id="next-heading" className="text-sm font-semibold text-slate-300">Up next</h5>
                  {upNext ? (
                    <button type="button" onClick={() => onEditBlock(upNext)} className="mt-2 block min-h-11 w-full rounded-lg border border-slate-600 p-3 text-left hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
                      <span className="block font-semibold">{upNext.title}</span>
                      <span className="mt-1 block text-sm text-slate-400">Starts {timeLabel(upNext.startAt)}</span>
                    </button>
                  ) : <p className="mt-2 text-sm text-slate-500">No later blocks today.</p>}
                </section>

                <section aria-labelledby="remaining-heading">
                  <h5 id="remaining-heading" className="text-sm font-semibold text-slate-300">Remaining today</h5>
                  <div className="mt-2 space-y-2">
                    {remaining.length ? remaining.map((block) => (
                      <article key={block.id} className="rounded-lg border border-slate-800 p-2">
                        <button type="button" onClick={() => onEditBlock(block)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-1 text-left hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
                          <span className={`min-w-0 truncate ${["COMPLETED", "SKIPPED"].includes(block.status) ? "text-slate-500 line-through" : ""}`}>{block.title}</span>
                          <span className="shrink-0 text-sm text-slate-400">{timeLabel(block.startAt)}</span>
                        </button>
                        {!['COMPLETED', 'SKIPPED'].includes(block.status) && <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => onStatusBlock(block, "COMPLETED")} className="min-h-11 flex-1 rounded-md border border-slate-700 px-2 text-xs font-semibold hover:bg-slate-800">Complete</button>
                          <button type="button" onClick={() => onStatusBlock(block, "SKIPPED")} className="min-h-11 flex-1 rounded-md border border-slate-700 px-2 text-xs font-semibold hover:bg-slate-800">Skip</button>
                        </div>}
                      </article>
                    )) : <p className="text-sm text-slate-500">The scheduled day is complete.</p>}
                  </div>
                </section>
              </div>
            )}
          </aside>

          <section className="lifeos-day-timeline rounded-xl border border-slate-700 bg-slate-950/60 p-3" aria-labelledby="day-timeline-heading">
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <h4 id="day-timeline-heading" className="font-semibold">Day timeline</h4>
              <button type="button" onClick={() => onCreateBlock(`${periodStart.slice(0, 10)}T09:00`, `${periodStart.slice(0, 10)}T10:00`)} className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold hover:bg-slate-800">+ Block</button>
            </div>
            <div ref={timelineRef} className="lifeos-day-scroll relative max-h-[32rem] overflow-y-auto overscroll-contain rounded-lg border border-slate-800 bg-slate-950" tabIndex={0} aria-label="Scrollable 24-hour timeline">
              <div className="relative h-[1152px] min-w-0 cursor-crosshair" onClick={emptySlot} aria-label="Tap an open time to create a block">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="absolute inset-x-0 h-12 border-t border-slate-800" style={{ top: `${hour * 48}px` }}>
                    <span className="absolute left-2 top-1 text-xs text-slate-500">{new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric" }).format(new Date(Date.UTC(2020, 0, 1, hour)))}</span>
                  </div>
                ))}
                {isToday && (
                  <div className="pointer-events-none absolute left-14 right-2 z-20 border-t-2 border-rose-400" style={{ top: `${currentMinutes * 0.8}px` }} aria-label={`Current time ${timeLabel(clock.toISOString())}`}>
                    <span className="absolute -left-1 -top-2 h-4 w-4 rounded-full bg-rose-400" />
                  </div>
                )}
                {dayGoals.map((goal) => {
                  const startMinute = minutesIntoSelectedDay(goal.startAt!);
                  const endMinute = minutesIntoSelectedDay(goal.endAt!, true);
                  return (
                    <button key={goal.id} type="button" onClick={(event) => { event.stopPropagation(); onEditGoal(goal); }} className="absolute left-16 right-3 z-[5] min-h-11 overflow-hidden rounded-lg border border-dashed border-slate-500 bg-slate-800/50 px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300" style={{ top: `${startMinute * 0.8}px`, height: `${Math.max(44, (endMinute - startMinute) * 0.8)}px` }} aria-label={`Edit objective span ${goal.title}, ${timeLabel(goal.startAt!)} to ${timeLabel(goal.endAt!)}`}>
                      <span className="block truncate font-semibold">{goal.title}</span>
                      <span className="block text-xs text-slate-300">Objective span · {timeLabel(goal.startAt!)}–{timeLabel(goal.endAt!)}</span>
                    </button>
                  );
                })}
                {positionedBlocks.map((block) => {
                  const startMinute = minutesIntoSelectedDay(block.startAt);
                  const endMinute = minutesIntoSelectedDay(block.endAt, true);
                  const laneWidth = 83 / block.columnCount;
                  const width = `${Math.max(12, laneWidth - 0.75)}%`;
                  const left = `${15 + block.column * laneWidth}%`;
                  const inactive = ["COMPLETED", "SKIPPED"].includes(block.status);
                  return (
                    <button key={block.id} type="button" onClick={(event) => { event.stopPropagation(); onEditBlock(block); }} className={`absolute z-10 min-h-11 overflow-hidden rounded-lg border px-2 py-1.5 text-left text-xs shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 ${inactive ? "border-slate-600 bg-slate-700/80 text-slate-300" : "border-teal-400 bg-teal-700/90 text-white"}`} style={{ top: `${startMinute * 0.8}px`, height: `${Math.max(44, (endMinute - startMinute) * 0.8)}px`, width, left }} aria-label={`Edit block ${block.title}, ${timeLabel(block.startAt)} to ${timeLabel(block.endAt)}, ${statusLabel(block.status)}`}>
                      <span className={`block truncate font-semibold ${inactive ? "line-through" : ""}`}>{block.title}</span>
                      <span className="block truncate opacity-90">{timeLabel(block.startAt)}–{timeLabel(block.endAt)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="px-1 pt-2 text-xs text-slate-500">Open grid space is available time. Tap it to create a 60-minute block. Dashed items are objective spans.</p>
          </section>
        </div>
      )}

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

      {level !== "DAY" && <div className={`lifeos-time-grid lifeos-time-grid--${level.toLowerCase()} mt-4 grid gap-2`} aria-label={`${level.toLowerCase()} time regions`}>
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
      </div>}

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
        <span>{visibleGoals.length} scheduled in view</span>
        <span aria-hidden="true">•</span>
        <span>{unscheduledCount} unscheduled objective{unscheduledCount === 1 ? "" : "s"}</span>
      </div>
    </section>
  );
}
