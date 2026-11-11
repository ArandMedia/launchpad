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
type SelfKnowledgeKind = "VALUE" | "CONVICTION" | "STRENGTH" | "GROWTH_EDGE";
type Principle = { id: string; domainKey: string; kind: SelfKnowledgeKind; title: string; statement: string; why: string; importance: number; active: boolean; updatedAt: string };
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
const selfStateFields = [
  { label: "Current season", key: "currentState", help: "What season of life are you in, and what is asking for your attention now?", placeholder: "Describe the realities, roles, opportunities, and pressures shaping this season…" },
  { label: "Person I am becoming", key: "desiredState", help: "What kind of person do you intend to become—not just what do you want to accomplish?", placeholder: "Describe the character, identity, and way of living you are growing toward…" },
  { label: "Tensions & blind spots", key: "gap", help: "Where do your behavior, beliefs, or circumstances conflict with who you want to be?", placeholder: "Name contradictions, recurring patterns, and things you may be avoiding…" },
  { label: "Practices that keep me aligned", key: "activeSystem", help: "What regular practices help you act like the person you intend to be?", placeholder: "Reflection, study, boundaries, conversations, routines, service…" },
  { label: "Decisions & experiments", key: "nextActions", help: "What will you try, decide, or discuss next to learn about yourself?", placeholder: "List the next honest conversation, experiment, or decision…" },
  { label: "What life is teaching me", key: "evidence", help: "What recent evidence is changing how you understand yourself or the world?", placeholder: "Record lessons, feedback, recurring signals, and changed beliefs…" },
] as const;
const selfKnowledgeKinds: Array<{ kind: SelfKnowledgeKind; label: string; shortLabel: string; help: string; accent: string }> = [
  { kind: "VALUE", label: "Value", shortLabel: "What matters", help: "A quality or priority you want your choices to honor.", accent: "border-violet-700 bg-violet-950/30 text-violet-200" },
  { kind: "CONVICTION", label: "Conviction", shortLabel: "What I believe", help: "A belief or principle you are willing to let constrain your choices.", accent: "border-sky-700 bg-sky-950/30 text-sky-200" },
  { kind: "STRENGTH", label: "Strength", shortLabel: "What I can lean on", help: "A capability or pattern that consistently helps you and others.", accent: "border-emerald-700 bg-emerald-950/30 text-emerald-200" },
  { kind: "GROWTH_EDGE", label: "Shortcoming / growth edge", shortLabel: "What needs attention", help: "A limitation, blind spot, or pattern you want to notice and improve.", accent: "border-amber-700 bg-amber-950/30 text-amber-200" },
];

function importanceLabel(value: number) {
  if (value >= 5) return "Essential now";
  if (value === 4) return "High importance";
  if (value === 3) return "Meaningful";
  if (value === 2) return "Secondary";
  return "Low right now";
}

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
  const [principleKind, setPrincipleKind] = useState<SelfKnowledgeKind>("VALUE");
  const [principleTitle, setPrincipleTitle] = useState("");
  const [principleStatement, setPrincipleStatement] = useState("");
  const [principleWhy, setPrincipleWhy] = useState("");
  const [principleImportance, setPrincipleImportance] = useState(4);
  const [editingPrincipleId, setEditingPrincipleId] = useState<string | null>(null);
  const [editPrincipleKind, setEditPrincipleKind] = useState<SelfKnowledgeKind>("VALUE");
  const [editPrincipleTitle, setEditPrincipleTitle] = useState("");
  const [editPrincipleStatement, setEditPrincipleStatement] = useState("");
  const [editPrincipleWhy, setEditPrincipleWhy] = useState("");
  const [editPrincipleImportance, setEditPrincipleImportance] = useState(3);
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
  const activeOutcomes = scoped.goals.filter((goal) => !goal.done);
  const soleActiveOutcome = activeOutcomes.length === 1 ? activeOutcomes[0] : null;
  const routineObjectiveTitle = (routine: Routine) => routine.objective?.title || soleActiveOutcome?.title || "";
  const profileFields = domainKey === "SELF" ? selfStateFields : stateFields;
  const sortedKnowledge = [...scoped.principles].sort((left, right) => Number(right.active) - Number(left.active) || right.importance - left.importance || left.title.localeCompare(right.title));
  const compass = Object.fromEntries(selfKnowledgeKinds.map(({ kind }) => [kind, sortedKnowledge.find((item) => item.active && item.kind === kind)])) as Partial<Record<SelfKnowledgeKind, Principle>>;

  async function saveState(event: FormEvent) { event.preventDefault(); await send("/api/lifeos/core", "POST", { kind: "domain-state", domainKey, ...state }); }
  async function addOutcome(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos", "POST", { kind: "goal", title: outcomeTitle, targetDate: outcomeTargetDate || null, horizon: "YEAR", domainKey })) { setOutcomeTitle(""); setOutcomeTargetDate(""); } }
  function schedulePayload(value: ScheduleDraft) {
    return { scheduleTime: value.time, scheduleDurationMinutes: value.duration, scheduleWeekdays: value.weekdays, scheduleDayOfMonth: value.dayOfMonth, scheduleStartsOn: value.startsOn };
  }
  async function addRoutine(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "routine", domainKey, title: routineTitle, cadence: routineCadence, notes: routineNotes, objectiveId: routineObjectiveId || null, ...schedulePayload(routineSchedule) })) { setRoutineTitle(""); setRoutineNotes(""); setRoutineSchedule(newSchedule()); } }
  async function addAction(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "action", domainKey, title: actionTitle })) setActionTitle(""); }
  async function addMetric(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "metric", domainKey, name: metricName, unit: metricUnit, direction: "NEUTRAL" })) { setMetricName(""); setMetricUnit(""); } }
  async function addMeasurement(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "measurement", metricId, value: measurementValue, note: measurementNote, observedAt: new Date().toISOString() })) { setMeasurementValue(""); setMeasurementNote(""); } }
  async function addPrinciple(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "principle", domainKey, principleKind: domainKey === "SELF" ? principleKind : "CONVICTION", title: principleTitle, statement: principleStatement, why: principleWhy, importance: principleImportance })) { setPrincipleTitle(""); setPrincipleStatement(""); setPrincipleWhy(""); } }
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

  async function updatePrinciple(principle: Principle, active = principle.active) {
    const editing = editingPrincipleId === principle.id;
    const saved = await send("/api/lifeos/core", "PATCH", {
      kind: "principle-update", id: principle.id, domainKey,
      principleKind: editing ? editPrincipleKind : principle.kind,
      title: editing ? editPrincipleTitle : principle.title,
      statement: editing ? editPrincipleStatement : principle.statement,
      why: editing ? editPrincipleWhy : principle.why,
      importance: editing ? editPrincipleImportance : principle.importance,
      active,
    });
    if (saved) setEditingPrincipleId(null);
  }

  if (!data && !error) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400" role="status">Loading {DOMAIN_LABELS[domainKey]}…</div>;

  return <div className="mt-5 space-y-5">
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-600 p-3 text-red-300">{error}</p>}
    <section className="rounded-2xl border border-violet-800 bg-violet-950/20 p-4 sm:p-5" aria-labelledby="workspace-guide-heading">
      <h3 id="workspace-guide-heading" className="text-lg font-semibold">{domainKey === "SELF" ? "A living reflection—not a permanent label" : "How this workspace works"}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(domainKey === "SELF" ? [
          ["1 · Reflect", "Describe the season you are actually in and the person you are becoming."],
          ["2 · Name", "Capture values, convictions, strengths, and shortcomings without turning them into fixed labels."],
          ["3 · Rank", "Adjust importance as your responsibilities, age, and circumstances change."],
          ["4 · Use", "Let the decision compass shape outcomes, habits, boundaries, and what you say no to."],
        ] : [
          ["1 · Map reality", "Current state, desired state, and the gap explain where you are and the direction you want to maintain."],
          ["2 · Choose outcomes", "A desired outcome is a finite result you can finish. Give it a target date when timing matters."],
          ["3 · Run a system", "Routines repeat and stay active or paused. Next actions are one-time moves you complete."],
          ["4 · Review evidence", "Use measurements and notes to decide whether the system is actually moving the gap."],
        ]).map(([title, copy]) => <div key={title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><p className="text-xs font-bold uppercase tracking-wide text-violet-300">{title}</p><p className="mt-1 text-sm text-slate-300">{copy}</p></div>)}
      </div>
    </section>
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h3 className="text-lg font-semibold">{domainKey === "SELF" ? "Living self-profile" : "Operating state"}</h3><p className="mt-1 text-sm text-slate-400">{domainKey === "SELF" ? "Update this when your season changes or experience changes your mind. The goal is an honest working picture, not a final definition of you." : intro || `Close the loop for ${DOMAIN_LABELS[domainKey]} with explicit state, systems, actions, and evidence.`}</p>
      <form onSubmit={saveState} className="mt-4 grid gap-4 md:grid-cols-2">
        {profileFields.map((field) => <label key={field.key} className="font-medium">{field.label}<span className="mt-1 block text-xs font-normal leading-5 text-slate-400">{field.help}</span><textarea rows={3} maxLength={6000} value={state[field.key]} onChange={(event) => setState((current) => ({ ...current, [field.key]: event.target.value }))} className={input} placeholder={field.placeholder} /></label>)}
        <div className="md:col-span-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>Save {domainKey === "SELF" ? "self-profile" : "operating state"}</button></div>
      </form>
    </section>

    {domainKey === "SELF" && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="decision-compass-heading">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">What is most important now</p><h3 id="decision-compass-heading" className="mt-1 text-xl font-semibold">Decision compass</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">The highest-priority active item in each category becomes a quick lens for choices. Change the importance below whenever life changes.</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Updates automatically</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{selfKnowledgeKinds.map((meta) => { const item = compass[meta.kind]; return <article key={meta.kind} className={`rounded-xl border p-4 ${meta.accent}`}><p className="text-xs font-bold uppercase tracking-wide opacity-80">{meta.shortLabel}</p><p className="mt-2 font-semibold text-slate-100">{item?.title || "Not named yet"}</p><p className="mt-2 text-xs leading-5 text-slate-300">{item ? item.why || item.statement || meta.help : meta.help}</p>{item && <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide opacity-75">{importanceLabel(item.importance)}</p>}</article>; })}</div>
      <div className="mt-4 rounded-xl border border-violet-900 bg-violet-950/20 p-4"><p className="font-semibold text-violet-200">Before a meaningful yes, no, or change, ask:</p><div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2"><p>Does this honor <span className="font-semibold text-white">{compass.VALUE?.title || "what matters most"}</span>?</p><p>Does it remain true to <span className="font-semibold text-white">{compass.CONVICTION?.title || "my convictions"}</span>?</p><p>Can I lean on <span className="font-semibold text-white">{compass.STRENGTH?.title || "a real strength"}</span>?</p><p>Am I accounting for <span className="font-semibold text-white">{compass.GROWTH_EDGE?.title || "a known blind spot"}</span>?</p></div></div>
    </section>}

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">{domainKey === "SELF" ? "Growth intentions & outcomes" : "Desired outcomes"}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{domainKey === "SELF" ? "Turn self-knowledge into a finishable change, conversation, learning goal, or boundary. Keep identity flexible; complete the result when it is real." : "These are finishable results that move you toward the desired state—not reminders you keep forever. Add a realistic target date when timing matters, then complete or reopen the outcome as reality changes."}</p>
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
        <h3 className="text-lg font-semibold">{domainKey === "SELF" ? "Practices & next steps" : "Active system"}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{domainKey === "SELF" ? "Use routines for practices that keep you aligned and next actions for one-time experiments, decisions, or conversations." : "Routines are recurring behaviors: keep them active while useful, pause them when they are not, and edit them as you learn. Next actions are one-time steps you can finish and reopen."}</p>
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
            {routineObjectiveTitle(item) && <p className="mt-1 text-xs text-violet-300">Supports: {routineObjectiveTitle(item)}</p>}
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
      <h3 className="text-lg font-semibold">{domainKey === "SELF" ? "Growth signals" : "Evidence & metrics"}</h3><p className="mt-1 text-sm text-slate-400">{domainKey === "SELF" ? "Track only signals that help you learn: alignment, follow-through, meaningful feedback, or a behavior you are trying to change." : <>Manual evidence is real data you enter. {domainKey === "HEALTH" ? "Health values are stored in a separate encrypted record boundary." : "No external provider data is inferred."}</>}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{scoped.metrics.map((metric) => { const latest = measurements.find((item) => item.metricId === metric.id); return <article key={metric.id} className="rounded-xl border border-slate-800 p-3"><p className="font-medium">{metric.name}</p><p className="mt-1 text-sm text-slate-400">{latest ? `${latest.value} ${metric.unit}` : "No measurements"}</p>{latest?.note && <p className="mt-1 text-xs text-slate-500">{latest.note}</p>}</article>; })}{!scoped.metrics.length && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No metrics defined. Start with one measure that changes a decision.</p>}</div>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Define metric or record evidence</summary><div className="mt-2 grid gap-4 md:grid-cols-2"><form onSubmit={addMetric}><label className="font-medium">Metric name<input required value={metricName} onChange={(e) => setMetricName(e.target.value)} className={input} /></label><label className="mt-2 block font-medium">Unit<input value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} mt-3 border border-slate-600`}>Define metric</button></form><form onSubmit={addMeasurement}><label className="font-medium">Metric<select required value={metricId} onChange={(e) => setMetricId(e.target.value)} className={input}><option value="">Choose metric</option>{scoped.metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><label className="mt-2 block font-medium">Value<input required type="number" step="any" value={measurementValue} onChange={(e) => setMeasurementValue(e.target.value)} className={input} /></label><label className="mt-2 block font-medium">Evidence note<input value={measurementNote} onChange={(e) => setMeasurementNote(e.target.value)} className={input} /></label><button disabled={busy || !metricId} className={`${button} mt-3 bg-violet-400 text-slate-950`}>Record evidence</button></form></div></details>
    </section>

    {domainKey === "SELF" && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="self-knowledge-heading">
      <div><h3 id="self-knowledge-heading" className="text-xl font-semibold">Values, convictions, strengths & growth edges</h3><p className="mt-1 max-w-4xl text-sm leading-6 text-slate-400">These are working observations, not permanent labels. Explain why each matters, rank its importance in this season, and archive it when it no longer reflects you. Archived items remain part of the record and can be restored.</p></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{sortedKnowledge.length ? sortedKnowledge.map((item) => { const meta = selfKnowledgeKinds.find((candidate) => candidate.kind === item.kind) || selfKnowledgeKinds[1]; return <article key={item.id} className={`rounded-xl border p-4 ${item.active ? meta.accent : "border-slate-800 bg-slate-950/40 text-slate-500"}`}>
        {editingPrincipleId === item.id ? <form onSubmit={(event) => { event.preventDefault(); updatePrinciple(item); }} className="grid gap-3 text-slate-100">
          <div className="grid gap-3 sm:grid-cols-2"><label className="font-medium">Type<select value={editPrincipleKind} onChange={(event) => setEditPrincipleKind(event.target.value as SelfKnowledgeKind)} className={input}>{selfKnowledgeKinds.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select></label><label className="font-medium">Importance now<select value={editPrincipleImportance} onChange={(event) => setEditPrincipleImportance(Number(event.target.value))} className={input}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} · {importanceLabel(value)}</option>)}</select></label></div>
          <label className="font-medium">Name<input required maxLength={180} value={editPrincipleTitle} onChange={(event) => setEditPrincipleTitle(event.target.value)} className={input} /></label>
          <label className="font-medium">What this means to me<textarea rows={2} maxLength={3000} value={editPrincipleStatement} onChange={(event) => setEditPrincipleStatement(event.target.value)} className={input} /></label>
          <label className="font-medium">Why it matters now<textarea rows={2} maxLength={3000} value={editPrincipleWhy} onChange={(event) => setEditPrincipleWhy(event.target.value)} className={input} /></label>
          <div className="flex flex-wrap gap-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950`}>Save</button><button type="button" onClick={() => setEditingPrincipleId(null)} className={`${button} border border-slate-700`}>Cancel</button></div>
        </form> : <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide opacity-75">{meta.label}</p><h4 className="mt-1 text-lg font-semibold text-slate-100">{item.title}</h4></div><div className="text-right"><span className="rounded-full border border-current px-2 py-1 text-[11px] font-semibold">{item.importance}/5</span><p className="mt-2 text-[11px] opacity-75">{importanceLabel(item.importance)}</p></div></div>
          {item.statement && <p className="mt-3 text-sm leading-6 text-slate-300">{item.statement}</p>}
          {item.why && <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-3"><p className="text-[11px] font-bold uppercase tracking-wide opacity-70">Why it matters now</p><p className="mt-1 text-sm leading-6 text-slate-200">{item.why}</p></div>}
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { setEditingPrincipleId(item.id); setEditPrincipleKind(item.kind); setEditPrincipleTitle(item.title); setEditPrincipleStatement(item.statement); setEditPrincipleWhy(item.why); setEditPrincipleImportance(item.importance); }} className={`${button} border border-current text-xs`}>Edit</button><button type="button" disabled={busy} onClick={() => updatePrinciple(item, !item.active)} className={`${button} border border-current text-xs`}>{item.active ? "Archive" : "Restore"}</button></div>
        </>}
      </article>; }) : <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm leading-6 text-slate-400 lg:col-span-2">Nothing has been named yet. Start with one value that currently guides your choices or one pattern you know you need to watch.</p>}</div>
      <details className="mt-4 rounded-xl border border-slate-800"><summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold text-violet-300">Add to my self-profile</summary><form onSubmit={addPrinciple} className="grid gap-4 border-t border-slate-800 p-4">
        <div className="grid gap-3 sm:grid-cols-2"><label className="font-medium">Type<select value={principleKind} onChange={(event) => setPrincipleKind(event.target.value as SelfKnowledgeKind)} className={input}>{selfKnowledgeKinds.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select><span className="mt-1 block text-xs font-normal leading-5 text-slate-400">{selfKnowledgeKinds.find((item) => item.kind === principleKind)?.help}</span></label><label className="font-medium">Importance now<select value={principleImportance} onChange={(event) => setPrincipleImportance(Number(event.target.value))} className={input}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} · {importanceLabel(value)}</option>)}</select><span className="mt-1 block text-xs font-normal leading-5 text-slate-400">This can change as your life changes.</span></label></div>
        <label className="font-medium">Name<input required maxLength={180} value={principleTitle} onChange={(event) => setPrincipleTitle(event.target.value)} className={input} placeholder={principleKind === "GROWTH_EDGE" ? "A pattern I need to notice…" : principleKind === "STRENGTH" ? "A capability I can rely on…" : "Name it clearly…"} /></label>
        <label className="font-medium">What this means to me<textarea rows={3} maxLength={3000} value={principleStatement} onChange={(event) => setPrincipleStatement(event.target.value)} className={input} placeholder="Define it in your own words and describe how it shows up…" /></label>
        <label className="font-medium">Why it matters now<textarea rows={3} maxLength={3000} value={principleWhy} onChange={(event) => setPrincipleWhy(event.target.value)} className={input} placeholder="Why does this deserve attention in your current season?" /></label>
        <button disabled={busy} className={`${button} w-fit bg-violet-400 text-slate-950`}>Add to self-profile</button>
      </form></details>
    </section>}

    {domainKey === "OMNIS" && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Principles</h3><div className="mt-3 space-y-2">{scoped.principles.map((item) => <article key={item.id} className="rounded-lg border border-slate-800 p-3"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-slate-400">{item.statement}</p></article>)}</div><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Add principle</summary><form onSubmit={addPrinciple} className="mt-2 grid gap-3"><label>Title<input required value={principleTitle} onChange={(e) => setPrincipleTitle(e.target.value)} className={input} /></label><label>Statement<textarea rows={2} value={principleStatement} onChange={(e) => setPrincipleStatement(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} w-fit border border-slate-600`}>Add principle</button></form></details></section>}

    {domainKey === "RELATIONSHIPS" && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Commitments & rhythms</h3><p className="mt-1 text-sm text-slate-400">Track your commitments—not scores for other people. Notes remain private.</p><div className="mt-3 space-y-2">{data?.commitments.map((item) => <article key={item.id} className="rounded-lg border border-slate-800 p-3"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.area}{item.cadence ? ` · ${item.cadence}` : ""}</p></article>)}</div><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Add commitment</summary><form onSubmit={addCommitment} className="mt-2 grid gap-3 sm:grid-cols-2"><label>Commitment<input required value={commitmentTitle} onChange={(e) => setCommitmentTitle(e.target.value)} className={input} /></label><label>Area<select value={commitmentArea} onChange={(e) => setCommitmentArea(e.target.value)} className={input}>{relationshipAreas.map((area) => <option key={area}>{area}</option>)}</select></label><label>Rhythm<input placeholder="Weekly, monthly…" value={commitmentCadence} onChange={(e) => setCommitmentCadence(e.target.value)} className={input} /></label><div className="self-end"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950`}>Add commitment</button></div></form></details></section>}
  </div>;
}
