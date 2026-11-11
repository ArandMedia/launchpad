"use client";

import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { DOMAIN_LABELS, type LifeOSDomainKey } from "@/lib/lifeos-domains";
import { LIFEOS_TIME_ZONE, nowInChicago } from "@/lib/lifeos-time";

type DomainState = { id: string; domainKey: string; currentState: string; desiredState: string; gap: string; activeSystem: string; nextActions: string; evidence: string };
type Goal = { id: string; title: string; domainKey: string; horizon: string; done: boolean; targetValue: number | null; targetUnit: string; targetDate: string | null };
type Routine = { id: string; domainKey: string; title: string; cadence: string; active: boolean; notes: string; objectiveId: string | null; objective: { title: string } | null; scheduleTime: string; scheduleDurationMinutes: number; scheduleWeekdays: number[]; scheduleDayOfMonth: number | null; scheduleStartsOn: string | null };
type Action = { id: string; domainKey: string; title: string; status: string };
type Metric = { id: string; domainKey: string; name: string; unit: string; sensitivity: string };
type Measurement = { id: string; metricId: string; value: number; note: string; observedAt: string };
type Principle = { id: string; domainKey: string; title: string; statement: string };
type Commitment = { id: string; area: string; title: string; cadence: string; note: string };
type CoreData = { domains: DomainState[]; goals: Goal[]; routines: Routine[]; actions: Action[]; metrics: Metric[]; measurements: Measurement[]; healthMeasurements: Measurement[]; principles: Principle[]; commitments: Commitment[] };

const emptyState = { currentState: "", desiredState: "", gap: "", activeSystem: "", nextActions: "", evidence: "" };
const input = "lifeos-editable mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/40";
const button = "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:opacity-50";
type ScheduleDraft = { time: string; duration: number; weekdays: number[]; dayOfMonth: number; startsOn: string };
const weekdayOptions = [[0, "Sun"], [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"]] as const;

function newSchedule(): ScheduleDraft {
  const today = nowInChicago().slice(0, 10);
  return { time: "", duration: 30, weekdays: [1], dayOfMonth: Number(today.slice(8, 10)), startsOn: today };
}

function RoutineScheduleFields({ cadence, value, onChange }: { cadence: string; value: ScheduleDraft; onChange: Dispatch<SetStateAction<ScheduleDraft>> }) {
  const scheduled = Boolean(value.time);
  return <fieldset className="rounded-xl border border-slate-700 p-3">
    <legend className="px-1 font-medium">Calendar schedule</legend>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={scheduled} onChange={(event) => onChange((current) => ({ ...current, time: event.target.checked ? "09:00" : "", weekdays: event.target.checked && current.weekdays.length === 0 ? [1] : current.weekdays }))} className="h-5 w-5 accent-violet-400" />Show this routine on Calendar</label>
    {scheduled && <div className="mt-3 grid gap-3">
      {cadence === "WEEKLY" && <fieldset><legend className="text-sm font-medium">Days</legend><div className="mt-2 flex flex-wrap gap-2">{weekdayOptions.map(([day, label]) => <label key={day} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 ${value.weekdays.includes(day) ? "border-violet-400 bg-violet-950/40" : "border-slate-700"}`}><input type="checkbox" checked={value.weekdays.includes(day)} onChange={() => onChange((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((item) => item !== day) : [...current.weekdays, day].sort() }))} className="accent-violet-400" />{label}</label>)}</div></fieldset>}
      {cadence === "MONTHLY" && <label className="text-sm font-medium">Day of month<input type="number" min={1} max={31} value={value.dayOfMonth} onChange={(event) => onChange((current) => ({ ...current, dayOfMonth: Number(event.target.value) }))} className={input} /></label>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Time<input required type="time" value={value.time} onChange={(event) => onChange((current) => ({ ...current, time: event.target.value }))} className={input} /></label>
        <label className="text-sm font-medium">Duration<select value={value.duration} onChange={(event) => onChange((current) => ({ ...current, duration: Number(event.target.value) }))} className={input}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>1 hour</option><option value={90}>90 minutes</option><option value={120}>2 hours</option></select></label>
      </div>
      <label className="text-sm font-medium">Start showing on<input required type="date" value={value.startsOn} onChange={(event) => onChange((current) => ({ ...current, startsOn: event.target.value }))} className={input} /></label>
      <p className="text-xs leading-5 text-slate-400">Occurrences use {LIFEOS_TIME_ZONE}. Pausing the routine removes its future appearances from Calendar.</p>
    </div>}
  </fieldset>;
}

function scheduleSummary(routine: Routine) {
  if (!routine.scheduleTime) return "Not shown on Calendar";
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(new Date(`2020-01-01T${routine.scheduleTime}:00.000Z`));
  const when = routine.cadence === "WEEKLY" ? routine.scheduleWeekdays.map((day) => weekdayOptions.find(([value]) => value === day)?.[1]).filter(Boolean).join(", ") : routine.cadence === "MONTHLY" ? `day ${routine.scheduleDayOfMonth}` : "every day";
  return `Calendar · ${when} at ${time} · ${routine.scheduleDurationMinutes} min`;
}
const stateFields = [
  { label: "Current state", key: "currentState", help: "What is objectively true right now?", placeholder: "Describe the present reality, not the story you wish were true…" },
  { label: "Desired state", key: "desiredState", help: "What should this area consistently look and feel like when it is working well?", placeholder: "Describe the ongoing direction; this is not something you check off…" },
  { label: "Gap", key: "gap", help: "What is missing or blocking movement from current to desired?", placeholder: "Name the constraint, missing capability, or behavior to change…" },
  { label: "Active system", key: "activeSystem", help: "What repeatable approach are you using to close the gap?", placeholder: "Describe the routines, rules, or structure you are running…" },
  { label: "Next actions", key: "nextActions", help: "What concrete one-time moves happen next?", placeholder: "List the next few actions that move the gap…" },
  { label: "Evidence", key: "evidence", help: "What facts will show that the system is working?", placeholder: "Define observations or measurements you will review…" },
] as const;

export default function DomainWorkspace({ domainKey, intro, areas = [] }: { domainKey: LifeOSDomainKey; intro?: string; areas?: string[] }) {
  const relationshipAreas = areas.length ? areas : ["Family", "Friends", "Community"];
  const [data, setData] = useState<CoreData | null>(null);
  const [state, setState] = useState(emptyState);
  const [status, setStatus] = useState("Loading workspace…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [outcomeTargetDate, setOutcomeTargetDate] = useState("");
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editOutcomeTitle, setEditOutcomeTitle] = useState("");
  const [editOutcomeTargetDate, setEditOutcomeTargetDate] = useState("");
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineCadence, setRoutineCadence] = useState("WEEKLY");
  const [routineNotes, setRoutineNotes] = useState("");
  const [routineObjectiveId, setRoutineObjectiveId] = useState("");
  const [routineSchedule, setRoutineSchedule] = useState<ScheduleDraft>(newSchedule);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editRoutineTitle, setEditRoutineTitle] = useState("");
  const [editRoutineCadence, setEditRoutineCadence] = useState("WEEKLY");
  const [editRoutineNotes, setEditRoutineNotes] = useState("");
  const [editRoutineObjectiveId, setEditRoutineObjectiveId] = useState("");
  const [editRoutineSchedule, setEditRoutineSchedule] = useState<ScheduleDraft>(newSchedule);
  const [actionTitle, setActionTitle] = useState("");
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editActionTitle, setEditActionTitle] = useState("");
  const [metricName, setMetricName] = useState("");
  const [metricUnit, setMetricUnit] = useState("");
  const [metricId, setMetricId] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [measurementNote, setMeasurementNote] = useState("");
  const [principleTitle, setPrincipleTitle] = useState("");
  const [principleStatement, setPrincipleStatement] = useState("");
  const [commitmentTitle, setCommitmentTitle] = useState("");
  const [commitmentArea, setCommitmentArea] = useState(relationshipAreas[0]);
  const [commitmentCadence, setCommitmentCadence] = useState("");

  async function refresh() {
    const response = await fetch("/api/lifeos/core", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load this private workspace");
    const next = await response.json() as CoreData;
    setData(next);
    const saved = next.domains.find((item) => item.domainKey === domainKey);
    setState(saved ? { currentState: saved.currentState, desiredState: saved.desiredState, gap: saved.gap, activeSystem: saved.activeSystem, nextActions: saved.nextActions, evidence: saved.evidence } : emptyState);
    const firstMetric = next.metrics.find((item) => item.domainKey === domainKey);
    setMetricId((current) => current || firstMetric?.id || "");
    const firstOutcome = next.goals.find((item) => item.domainKey === domainKey && !item.done);
    setRoutineObjectiveId((current) => current || firstOutcome?.id || "");
  }

  useEffect(() => { refresh().then(() => setStatus("Workspace loaded")).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load")); }, [domainKey]);

  async function send(url: string, method: "POST" | "PATCH", body: object) {
    setBusy(true); setError(""); setStatus("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error || "Unable to save"); }
      await refresh(); setStatus("Saved"); return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save"); return false; }
    finally { setBusy(false); }
  }

  const scoped = useMemo(() => ({
    goals: data?.goals.filter((item) => item.domainKey === domainKey) ?? [],
    routines: data?.routines.filter((item) => item.domainKey === domainKey) ?? [],
    actions: data?.actions.filter((item) => item.domainKey === domainKey) ?? [],
    metrics: data?.metrics.filter((item) => item.domainKey === domainKey) ?? [],
    principles: data?.principles.filter((item) => item.domainKey === domainKey) ?? [],
  }), [data, domainKey]);

  const measurements = domainKey === "HEALTH" ? data?.healthMeasurements ?? [] : data?.measurements ?? [];

  async function saveState(event: FormEvent) { event.preventDefault(); await send("/api/lifeos/core", "POST", { kind: "domain-state", domainKey, ...state }); }
  async function addOutcome(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos", "POST", { kind: "goal", title: outcomeTitle, targetDate: outcomeTargetDate || null, horizon: "YEAR", domainKey })) { setOutcomeTitle(""); setOutcomeTargetDate(""); } }
  function schedulePayload(value: ScheduleDraft) {
    return { scheduleTime: value.time, scheduleDurationMinutes: value.duration, scheduleWeekdays: value.weekdays, scheduleDayOfMonth: value.dayOfMonth, scheduleStartsOn: value.startsOn };
  }
  async function addRoutine(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "routine", domainKey, title: routineTitle, cadence: routineCadence, notes: routineNotes, objectiveId: routineObjectiveId || null, ...schedulePayload(routineSchedule) })) { setRoutineTitle(""); setRoutineNotes(""); setRoutineSchedule(newSchedule()); } }
  async function addAction(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "action", domainKey, title: actionTitle })) setActionTitle(""); }
  async function addMetric(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "metric", domainKey, name: metricName, unit: metricUnit, direction: "NEUTRAL" })) { setMetricName(""); setMetricUnit(""); } }
  async function addMeasurement(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "measurement", metricId, value: measurementValue, note: measurementNote, observedAt: new Date().toISOString() })) { setMeasurementValue(""); setMeasurementNote(""); } }
  async function addPrinciple(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "principle", domainKey, title: principleTitle, statement: principleStatement })) { setPrincipleTitle(""); setPrincipleStatement(""); } }
  async function addCommitment(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "commitment", title: commitmentTitle, area: commitmentArea, cadence: commitmentCadence })) { setCommitmentTitle(""); setCommitmentCadence(""); } }

  async function updateOutcome(goal: Goal, done = goal.done) {
    const title = editingOutcomeId === goal.id ? editOutcomeTitle : goal.title;
    const targetDate = editingOutcomeId === goal.id ? editOutcomeTargetDate : goal.targetDate?.slice(0, 10) || null;
    const saved = await send("/api/lifeos/core", "PATCH", { kind: "goal-update", id: goal.id, domainKey, title, targetDate, done });
    if (saved) setEditingOutcomeId(null);
  }

  async function updateRoutine(routine: Routine) {
    const saved = await send("/api/lifeos/core", "PATCH", { kind: "routine-update", id: routine.id, domainKey, title: editRoutineTitle, cadence: editRoutineCadence, notes: editRoutineNotes, active: routine.active, objectiveId: editRoutineObjectiveId || null, ...schedulePayload(editRoutineSchedule) });
    if (saved) setEditingRoutineId(null);
  }

  async function updateAction(action: Action) {
    const saved = await send("/api/lifeos/core", "PATCH", { kind: "action-update", id: action.id, domainKey, title: editActionTitle, status: action.status });
    if (saved) setEditingActionId(null);
  }

  if (!data && !error) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400" role="status">Loading {DOMAIN_LABELS[domainKey]}…</div>;

  return <div className="mt-5 space-y-5">
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-600 p-3 text-red-300">{error}</p>}
    <section className="rounded-2xl border border-violet-800 bg-violet-950/20 p-4 sm:p-5" aria-labelledby="workspace-guide-heading">
      <h3 id="workspace-guide-heading" className="text-lg font-semibold">How this workspace works</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><p className="text-xs font-bold uppercase tracking-wide text-violet-300">1 · Map reality</p><p className="mt-1 text-sm text-slate-300">Current state, desired state, and the gap explain where you are and the direction you want to maintain.</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><p className="text-xs font-bold uppercase tracking-wide text-violet-300">2 · Choose outcomes</p><p className="mt-1 text-sm text-slate-300">A desired outcome is a finite result you can finish. Give it a target date when timing matters.</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><p className="text-xs font-bold uppercase tracking-wide text-violet-300">3 · Run a system</p><p className="mt-1 text-sm text-slate-300">Routines repeat and stay active or paused. Next actions are one-time moves you complete.</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><p className="text-xs font-bold uppercase tracking-wide text-violet-300">4 · Review evidence</p><p className="mt-1 text-sm text-slate-300">Use measurements and notes to decide whether the system is actually moving the gap.</p></div>
      </div>
    </section>
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Operating state</h3><p className="mt-1 text-sm text-slate-400">{intro || `Close the loop for ${DOMAIN_LABELS[domainKey]} with explicit state, systems, actions, and evidence.`}</p>
      <form onSubmit={saveState} className="mt-4 grid gap-4 md:grid-cols-2">
        {stateFields.map((field) => <label key={field.key} className="font-medium">{field.label}<span className="mt-1 block text-xs font-normal leading-5 text-slate-400">{field.help}</span><textarea rows={3} maxLength={6000} value={state[field.key]} onChange={(event) => setState((current) => ({ ...current, [field.key]: event.target.value }))} className={input} placeholder={field.placeholder} /></label>)}
        <div className="md:col-span-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>Save operating state</button></div>
      </form>
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Desired outcomes</h3><p className="mt-1 text-sm leading-6 text-slate-400">These are finishable results that move you toward the desired state—not reminders you keep forever. Add a realistic target date when timing matters, then complete or reopen the outcome as reality changes.</p>
        <div className="mt-3 space-y-2">{scoped.goals.length ? scoped.goals.map((goal) => {
          const due = goal.targetDate?.slice(0, 10) || "";
          const overdue = Boolean(due && !goal.done && due < new Date().toISOString().slice(0, 10));
          return <article key={goal.id} className="rounded-lg border border-slate-800 p-3">
            {editingOutcomeId === goal.id ? <form onSubmit={(event) => { event.preventDefault(); updateOutcome(goal); }} className="grid gap-3">
              <label className="font-medium">Outcome<input required maxLength={180} value={editOutcomeTitle} onChange={(event) => setEditOutcomeTitle(event.target.value)} className={input} /></label>
              <label className="font-medium">Target date <span className="text-xs font-normal text-slate-400">(optional)</span><input type="date" value={editOutcomeTargetDate} onChange={(event) => setEditOutcomeTargetDate(event.target.value)} className={input} /></label>
              <div className="flex flex-wrap gap-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950`}>Save</button><button type="button" onClick={() => setEditingOutcomeId(null)} className={`${button} border border-slate-700`}>Cancel</button></div>
            </form> : <>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className={goal.done ? "text-slate-500 line-through" : "font-medium"}>{goal.title}</p><p className={`mt-1 text-xs ${overdue ? "font-semibold text-rose-300" : "text-slate-500"}`}>{due ? `${overdue ? "Overdue" : goal.done ? "Target was" : "Target"} · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${due}T12:00:00.000Z`))}` : "No target date"}</p></div><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${goal.done ? "border-emerald-800 text-emerald-300" : "border-slate-700 text-slate-400"}`}>{goal.done ? "Complete" : "Active"}</span></div>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => updateOutcome(goal, !goal.done)} className={`${button} border border-slate-700 text-sm`}>{goal.done ? "Reopen" : "Complete"}</button><button type="button" onClick={() => { setEditingOutcomeId(goal.id); setEditOutcomeTitle(goal.title); setEditOutcomeTargetDate(due); }} className={`${button} border border-slate-700 text-sm`}>Edit</button></div>
            </>}
          </article>;
        }) : <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No outcomes yet. Add the first finishable result when the desired state is clear.</p>}</div>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Add outcome</summary><form onSubmit={addOutcome} className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]"><label className="font-medium">Outcome<input required maxLength={180} value={outcomeTitle} onChange={(e) => setOutcomeTitle(e.target.value)} className={input} /></label><label className="font-medium">Target date <span className="text-xs font-normal text-slate-400">(optional)</span><input type="date" value={outcomeTargetDate} onChange={(event) => setOutcomeTargetDate(event.target.value)} className={input} /></label><button disabled={busy} className={`${button} self-end bg-violet-400 text-slate-950`}>Add</button></form></details>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Active system</h3><p className="mt-1 text-sm leading-6 text-slate-400">Routines are recurring behaviors: keep them active while useful, pause them when they are not, and edit them as you learn. Next actions are one-time steps you can finish and reopen.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2"><div><h4 className="text-sm font-semibold text-slate-300">Routines</h4>{scoped.routines.length ? scoped.routines.map((item) => <article key={item.id} className="mt-2 rounded-lg border border-slate-800 p-3 text-sm">
          {editingRoutineId === item.id ? <form onSubmit={(event) => { event.preventDefault(); updateRoutine(item); }} className="grid gap-3">
            <label>Routine<input required maxLength={180} value={editRoutineTitle} onChange={(event) => setEditRoutineTitle(event.target.value)} className={input} /></label>
            <label>Cadence<select value={editRoutineCadence} onChange={(event) => setEditRoutineCadence(event.target.value)} className={input}><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select></label>
            <label>Supports objective <span className="text-xs font-normal text-slate-400">(optional)</span><select value={editRoutineObjectiveId} onChange={(event) => setEditRoutineObjectiveId(event.target.value)} className={input}><option value="">No linked objective</option>{scoped.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
            <RoutineScheduleFields cadence={editRoutineCadence} value={editRoutineSchedule} onChange={setEditRoutineSchedule} />
            <label>How to run it<textarea rows={2} maxLength={1000} value={editRoutineNotes} onChange={(event) => setEditRoutineNotes(event.target.value)} className={input} /></label>
            <div className="flex flex-wrap gap-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950`}>Save</button><button type="button" onClick={() => setEditingRoutineId(null)} className={`${button} border border-slate-700`}>Cancel</button></div>
          </form> : <>
            <div className="flex items-start justify-between gap-2"><div><p className={item.active ? "font-medium" : "text-slate-500"}>{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.cadence.toLowerCase()} · {item.active ? "active" : "paused"}</p></div><span className={`rounded-full border px-2 py-1 text-xs ${item.active ? "border-violet-800 text-violet-300" : "border-slate-700 text-slate-500"}`}>{item.active ? "Active" : "Paused"}</span></div>
            <p className="mt-2 text-xs font-medium text-cyan-300">{scheduleSummary(item)}</p>
            {item.objective && <p className="mt-1 text-xs text-violet-300">Supports: {item.objective.title}</p>}
            {item.notes && <p className="mt-2 text-xs leading-5 text-slate-400">{item.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => send("/api/lifeos/core", "PATCH", { kind: "routine-status", id: item.id, active: !item.active, domainKey })} className={`${button} border border-slate-700 text-xs`}>{item.active ? "Pause" : "Resume"}</button><button type="button" onClick={() => { setEditingRoutineId(item.id); setEditRoutineTitle(item.title); setEditRoutineCadence(item.cadence); setEditRoutineNotes(item.notes); setEditRoutineObjectiveId(item.objectiveId ?? scoped.goals.find((goal) => !goal.done)?.id ?? ""); setEditRoutineSchedule({ time: item.scheduleTime, duration: item.scheduleDurationMinutes, weekdays: item.scheduleWeekdays, dayOfMonth: item.scheduleDayOfMonth ?? 1, startsOn: item.scheduleStartsOn?.slice(0, 10) || nowInChicago().slice(0, 10) }); }} className={`${button} border border-slate-700 text-xs`}>Edit</button></div>
          </>}
        </article>) : <p className="mt-2 rounded-lg border border-dashed border-slate-800 p-3 text-sm text-slate-500">No routines yet.</p>}</div><div><h4 className="text-sm font-semibold text-slate-300">Next actions</h4>{scoped.actions.length ? scoped.actions.map((item) => <article key={item.id} className="mt-2 rounded-lg border border-slate-800 p-3">
          {editingActionId === item.id ? <form onSubmit={(event) => { event.preventDefault(); updateAction(item); }} className="grid gap-3"><label className="text-sm">Next action<input required maxLength={180} value={editActionTitle} onChange={(event) => setEditActionTitle(event.target.value)} className={input} /></label><div className="flex flex-wrap gap-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950`}>Save</button><button type="button" onClick={() => setEditingActionId(null)} className={`${button} border border-slate-700`}>Cancel</button></div></form> : <><p className={`text-sm ${item.status === "DONE" ? "text-slate-500 line-through" : ""}`}>{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.status.toLowerCase()}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => send("/api/lifeos/core", "PATCH", { kind: "action-status", id: item.id, status: item.status === "DONE" ? "OPEN" : "DONE", domainKey })} className={`${button} border border-slate-700 text-xs`}>{item.status === "DONE" ? "Reopen" : "Done"}</button><button type="button" onClick={() => { setEditingActionId(item.id); setEditActionTitle(item.title); }} className={`${button} border border-slate-700 text-xs`}>Edit</button></div></>}
        </article>) : <p className="mt-2 rounded-lg border border-dashed border-slate-800 p-3 text-sm text-slate-500">No next actions yet.</p>}</div></div>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Add routine or action</summary><div className="mt-2 grid gap-3 sm:grid-cols-2"><form onSubmit={addRoutine} className="grid gap-3"><label className="font-medium">Routine<input required value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} className={input} /></label><label className="block text-sm">Cadence<select value={routineCadence} onChange={(e) => setRoutineCadence(e.target.value)} className={input}><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select></label><label className="block text-sm">Supports objective <span className="text-xs text-slate-400">(optional)</span><select value={routineObjectiveId} onChange={(event) => setRoutineObjectiveId(event.target.value)} className={input}><option value="">No linked objective</option>{scoped.goals.filter((goal) => !goal.done).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><RoutineScheduleFields cadence={routineCadence} value={routineSchedule} onChange={setRoutineSchedule} /><label className="block text-sm">How to run it <span className="text-xs text-slate-400">(optional)</span><textarea rows={2} maxLength={1000} value={routineNotes} onChange={(event) => setRoutineNotes(event.target.value)} className={input} placeholder="Define when, where, or what counts…" /></label><button disabled={busy} className={`${button} border border-slate-600`}>Add routine</button></form><form onSubmit={addAction}><label className="font-medium">Next action<input required value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} className={input} /></label><p className="mt-2 text-xs leading-5 text-slate-400">Use this for a one-time move. When it is done, mark it complete; use a routine for behavior you intend to repeat.</p><button disabled={busy} className={`${button} mt-3 border border-slate-600`}>Add action</button></form></div></details>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Evidence & metrics</h3><p className="mt-1 text-sm text-slate-400">Manual evidence is real data you enter. {domainKey === "HEALTH" ? "Health values are stored in a separate encrypted record boundary." : "No external provider data is inferred."}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{scoped.metrics.map((metric) => { const latest = measurements.find((item) => item.metricId === metric.id); return <article key={metric.id} className="rounded-xl border border-slate-800 p-3"><p className="font-medium">{metric.name}</p><p className="mt-1 text-sm text-slate-400">{latest ? `${latest.value} ${metric.unit}` : "No measurements"}</p>{latest?.note && <p className="mt-1 text-xs text-slate-500">{latest.note}</p>}</article>; })}{!scoped.metrics.length && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No metrics defined. Start with one measure that changes a decision.</p>}</div>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Define metric or record evidence</summary><div className="mt-2 grid gap-4 md:grid-cols-2"><form onSubmit={addMetric}><label className="font-medium">Metric name<input required value={metricName} onChange={(e) => setMetricName(e.target.value)} className={input} /></label><label className="mt-2 block font-medium">Unit<input value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} mt-3 border border-slate-600`}>Define metric</button></form><form onSubmit={addMeasurement}><label className="font-medium">Metric<select required value={metricId} onChange={(e) => setMetricId(e.target.value)} className={input}><option value="">Choose metric</option>{scoped.metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><label className="mt-2 block font-medium">Value<input required type="number" step="any" value={measurementValue} onChange={(e) => setMeasurementValue(e.target.value)} className={input} /></label><label className="mt-2 block font-medium">Evidence note<input value={measurementNote} onChange={(e) => setMeasurementNote(e.target.value)} className={input} /></label><button disabled={busy || !metricId} className={`${button} mt-3 bg-violet-400 text-slate-950`}>Record evidence</button></form></div></details>
    </section>

    {(domainKey === "SELF" || domainKey === "OMNIS") && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Principles</h3><div className="mt-3 space-y-2">{scoped.principles.map((item) => <article key={item.id} className="rounded-lg border border-slate-800 p-3"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-slate-400">{item.statement}</p></article>)}</div><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Add principle</summary><form onSubmit={addPrinciple} className="mt-2 grid gap-3"><label>Title<input required value={principleTitle} onChange={(e) => setPrincipleTitle(e.target.value)} className={input} /></label><label>Statement<textarea rows={2} value={principleStatement} onChange={(e) => setPrincipleStatement(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} w-fit border border-slate-600`}>Add principle</button></form></details></section>}

    {domainKey === "RELATIONSHIPS" && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Commitments & rhythms</h3><p className="mt-1 text-sm text-slate-400">Track your commitments—not scores for other people. Notes remain private.</p><div className="mt-3 space-y-2">{data?.commitments.map((item) => <article key={item.id} className="rounded-lg border border-slate-800 p-3"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.area}{item.cadence ? ` · ${item.cadence}` : ""}</p></article>)}</div><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Add commitment</summary><form onSubmit={addCommitment} className="mt-2 grid gap-3 sm:grid-cols-2"><label>Commitment<input required value={commitmentTitle} onChange={(e) => setCommitmentTitle(e.target.value)} className={input} /></label><label>Area<select value={commitmentArea} onChange={(e) => setCommitmentArea(e.target.value)} className={input}>{relationshipAreas.map((area) => <option key={area}>{area}</option>)}</select></label><label>Rhythm<input placeholder="Weekly, monthly…" value={commitmentCadence} onChange={(e) => setCommitmentCadence(e.target.value)} className={input} /></label><div className="self-end"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950`}>Add commitment</button></div></form></details></section>}
  </div>;
}
