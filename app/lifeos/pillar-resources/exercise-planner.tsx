"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  EXERCISE_CATALOG,
  EXERCISE_CATEGORIES,
  EXERCISE_EQUIPMENT,
  EXERCISE_MUSCLE_GROUPS,
  plannedWorkoutDuration,
  plannedWorkoutNotes,
  type CatalogExercise,
  type ExerciseCategory,
  type PlannedExercise,
  type PlannedWorkoutHandoff,
  type WorkoutPlanPayload,
} from "@/lib/lifeos-exercises";

type WorkoutPlanView = WorkoutPlanPayload & { id: string; scheduledFor: string; workoutId: string | null };
type AddDraft = { scheduledFor: string; planTitle: string; sets: string; reps: string; durationMinutes: string; notes: string };

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-base text-slate-100 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/25";
const categoryLabels: Record<ExerciseCategory, string> = { UPPER: "Upper body", LOWER: "Lower body", CARDIO: "Cardio" };

function calendarDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 10);
}

function startOfWeek(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dayTitle(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(`${value}T12:00:00`));
}

export default function ExercisePlanner({ onLogPlan, refreshKey }: { onLogPlan: (plan: PlannedWorkoutHandoff) => void; refreshKey: number }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [plans, setPlans] = useState<WorkoutPlanView[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"ALL" | ExerciseCategory>("ALL");
  const [muscle, setMuscle] = useState("ALL");
  const [equipment, setEquipment] = useState("ALL");
  const [selected, setSelected] = useState<CatalogExercise | null>(null);
  const [draft, setDraft] = useState<AddDraft>(() => ({ scheduledFor: calendarDate(new Date()), planTitle: "", sets: "3", reps: "8–12", durationMinutes: "", notes: "" }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => calendarDate(addDays(weekStart, index))), [weekStart]);

  async function load() {
    const response = await fetch(`/api/lifeos/workout-plans?from=${days[0]}&to=${days[6]}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load this week’s workout plan");
    const data = await response.json();
    setPlans(data.plans ?? []);
  }

  useEffect(() => { load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load workout plans")); }, [days[0], days[6], refreshKey]);

  const visibleCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    return EXERCISE_CATALOG.filter((exercise) => {
      if (category !== "ALL" && exercise.category !== category) return false;
      if (muscle !== "ALL" && exercise.muscleGroup !== muscle) return false;
      if (equipment !== "ALL" && exercise.equipment !== equipment) return false;
      return !query || `${exercise.name} ${exercise.muscleGroup} ${exercise.equipment} ${exercise.pattern}`.toLowerCase().includes(query);
    });
  }, [category, equipment, muscle, search]);

  function chooseExercise(exercise: CatalogExercise) {
    const targetDate = days.includes(calendarDate(new Date())) ? calendarDate(new Date()) : days[0];
    const existing = plans.find((plan) => plan.scheduledFor === targetDate);
    setSelected(exercise);
    setDraft({ scheduledFor: targetDate, planTitle: existing?.title ?? `${dayTitle(targetDate)} workout`, sets: exercise.category === "CARDIO" ? "" : "3", reps: exercise.category === "CARDIO" ? "" : "8–12", durationMinutes: exercise.category === "CARDIO" ? "30" : "", notes: "" });
    setError("");
    setNotice("");
    requestAnimationFrame(() => document.getElementById("plan-exercise-form")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const existing = plans.find((plan) => plan.scheduledFor === draft.scheduledFor);
      const item: PlannedExercise = { itemId: crypto.randomUUID(), catalogId: selected.id, name: selected.name, sets: draft.sets ? Number(draft.sets) : null, reps: draft.reps.trim(), durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null, notes: draft.notes.trim() };
      const plan: WorkoutPlanPayload = { title: draft.planTitle.trim() || `${dayTitle(draft.scheduledFor)} workout`, notes: existing?.notes ?? "", exercises: [...(existing?.exercises ?? []), item] };
      const response = await fetch("/api/lifeos/workout-plans", { method: existing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(existing ? { id: existing.id } : {}), scheduledFor: draft.scheduledFor, plan }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Unable to add exercise to the plan");
      await load();
      setSelected(null);
      setNotice(`${selected.name} added to ${dayTitle(draft.scheduledFor)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the plan");
    } finally {
      setBusy(false);
    }
  }

  async function removeExercise(plan: WorkoutPlanView, itemId: string) {
    setBusy(true);
    setError("");
    try {
      const exercises = plan.exercises.filter((exercise) => exercise.itemId !== itemId);
      const response = await fetch("/api/lifeos/workout-plans", exercises.length ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: plan.id, scheduledFor: plan.scheduledFor, plan: { title: plan.title, notes: plan.notes, exercises } }) } : { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: plan.id }) });
      if (!response.ok) throw new Error("Unable to remove the exercise");
      await load();
      setNotice("Plan updated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the plan");
    } finally {
      setBusy(false);
    }
  }

  function logPlan(plan: WorkoutPlanView) {
    onLogPlan({ planId: plan.id, title: plan.title, scheduledFor: plan.scheduledFor, durationMinutes: plannedWorkoutDuration(plan), notes: plannedWorkoutNotes(plan) });
    requestAnimationFrame(() => document.getElementById("workout-tracker-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <section className="rounded-2xl border border-sky-700/60 bg-sky-950/15 p-4 sm:p-5" aria-labelledby="exercise-planner-heading">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Health · Exercise catalog</p><h3 id="exercise-planner-heading" className="mt-1 text-xl font-semibold">Home-gym catalog &amp; weekly planner</h3><p className="mt-1 max-w-3xl text-base leading-6 text-slate-400">Plan upper body, lower body, and cardio sessions around your Smith/cable station, RS3 rower, treadmill, bike, bench, and free weights. Then send the finished session into your encrypted workout log.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-200">Previous week</button><button type="button" onClick={() => setWeekStart(startOfWeek())} className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-200">This week</button><button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-200">Next week</button></div></div>

    {(error || notice) && <p role={error ? "alert" : "status"} className={`mt-4 rounded-xl border p-3 text-sm ${error ? "border-red-500/60 bg-red-950/30 text-red-200" : "border-sky-500/50 bg-sky-950/25 text-sky-200"}`}>{error || notice}</p>}

    <div className="mt-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h4 className="font-semibold text-slate-100">Week of {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(weekStart)}</h4><p className="text-sm text-slate-500">Plan one session per day; each session can contain multiple exercises.</p></div></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {days.map((date) => { const plan = plans.find((item) => item.scheduledFor === date); return <article key={date} className={`rounded-xl border p-4 ${date === calendarDate(new Date()) ? "border-sky-500 bg-sky-950/30" : "border-slate-700 bg-slate-950/60"}`}><div className="flex items-start justify-between gap-2"><div><h5 className="font-semibold text-slate-100">{dayTitle(date)}</h5><p className="text-sm text-slate-500">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`))}</p></div>{plan?.workoutId && <span className="rounded-full border border-emerald-700 px-2 py-1 text-xs font-semibold text-emerald-300">Logged</span>}</div>{plan ? <><p className="mt-3 text-sm font-semibold text-sky-200">{plan.title}</p><ul className="mt-2 space-y-2">{plan.exercises.map((exercise) => <li key={exercise.itemId} className="rounded-lg bg-slate-900 p-2 text-sm text-slate-300"><div className="flex items-start justify-between gap-2"><span>{exercise.name}</span>{!plan.workoutId && <button type="button" disabled={busy} onClick={() => void removeExercise(plan, exercise.itemId)} aria-label={`Remove ${exercise.name}`} className="min-h-8 min-w-8 rounded text-red-300">×</button>}</div><span className="text-xs text-slate-500">{[exercise.sets ? `${exercise.sets} sets` : "", exercise.reps, exercise.durationMinutes ? `${exercise.durationMinutes} min` : ""].filter(Boolean).join(" · ")}</span></li>)}</ul>{!plan.workoutId && <button type="button" onClick={() => logPlan(plan)} className="mt-3 min-h-11 w-full rounded-lg bg-sky-400 px-3 text-sm font-semibold text-slate-950 hover:bg-sky-300">Log this day</button>}</> : <p className="mt-4 text-sm text-slate-600">No exercises planned.</p>}</article>; })}
      </div>
    </div>

    <div className="mt-6 border-t border-slate-800 pt-5"><div><h4 className="font-semibold text-slate-100">Browse your home-gym exercises</h4><p className="text-sm text-slate-500">Choose a category, select an exercise, then add its sets, reps, or time to any day.</p></div>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Exercise category"><button type="button" aria-pressed={category === "UPPER"} onClick={() => setCategory(category === "UPPER" ? "ALL" : "UPPER")} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${category === "UPPER" ? "border-sky-400 bg-sky-400 text-slate-950" : "border-slate-600 text-slate-200"}`}>Upper body</button><button type="button" aria-pressed={category === "LOWER"} onClick={() => setCategory(category === "LOWER" ? "ALL" : "LOWER")} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${category === "LOWER" ? "border-sky-400 bg-sky-400 text-slate-950" : "border-slate-600 text-slate-200"}`}>Lower body</button><button type="button" aria-pressed={category === "CARDIO"} onClick={() => setCategory(category === "CARDIO" ? "ALL" : "CARDIO")} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${category === "CARDIO" ? "border-sky-400 bg-sky-400 text-slate-950" : "border-slate-600 text-slate-200"}`}>Cardio</button></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm font-medium text-slate-300">Search<input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Exercise or movement…" /></label><label className="text-sm font-medium text-slate-300">Category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className={inputClass}><option value="ALL">All categories</option>{EXERCISE_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label><label className="text-sm font-medium text-slate-300">Muscle group<select value={muscle} onChange={(event) => setMuscle(event.target.value)} className={inputClass}><option value="ALL">All muscle groups</option>{EXERCISE_MUSCLE_GROUPS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-medium text-slate-300">Equipment<select value={equipment} onChange={(event) => setEquipment(event.target.value)} className={inputClass}><option value="ALL">All equipment</option>{EXERCISE_EQUIPMENT.map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <div className="mt-3 max-h-[32rem] overflow-y-auto rounded-xl border border-slate-800 p-2"><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{visibleCatalog.map((exercise) => <article key={exercise.id} className="rounded-lg border border-slate-700 bg-slate-950/65 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-sky-800 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sky-300">{categoryLabels[exercise.category]}</span><span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400">{exercise.equipment}</span></div><h5 className="mt-2 font-semibold text-slate-100">{exercise.name}</h5><p className="mt-1 text-sm text-slate-500">{exercise.muscleGroup} · {exercise.pattern}</p></div><button type="button" onClick={() => chooseExercise(exercise)} className="min-h-11 shrink-0 rounded-lg border border-sky-600 px-3 text-sm font-semibold text-sky-200 hover:bg-sky-950/60">Plan</button></div><p className="mt-2 text-sm leading-5 text-slate-400">{exercise.guidance}</p></article>)}</div>{!visibleCatalog.length && <p className="p-6 text-center text-sm text-slate-500">No exercises match those filters.</p>}</div>
    </div>

    {selected && <form id="plan-exercise-form" onSubmit={savePlan} className="mt-5 scroll-mt-8 rounded-xl border border-sky-600 bg-slate-900 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-sky-300">Add to weekly plan</p><h4 className="mt-1 font-semibold text-slate-100">{selected.name}</h4></div><button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-300">Close</button></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="text-sm font-medium text-slate-300">Day<select value={draft.scheduledFor} onChange={(event) => { const date = event.target.value; const existing = plans.find((plan) => plan.scheduledFor === date); setDraft({ ...draft, scheduledFor: date, planTitle: existing?.title ?? `${dayTitle(date)} workout` }); }} className={inputClass}>{days.map((date) => <option key={date} value={date}>{dayTitle(date)} · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`))}</option>)}</select></label><label className="text-sm font-medium text-slate-300">Plan name<input required maxLength={160} value={draft.planTitle} onChange={(event) => setDraft({ ...draft, planTitle: event.target.value })} className={inputClass} /></label><label className="text-sm font-medium text-slate-300">Sets<input type="number" min="1" max="100" inputMode="numeric" value={draft.sets} onChange={(event) => setDraft({ ...draft, sets: event.target.value })} className={inputClass} placeholder="Optional" /></label><label className="text-sm font-medium text-slate-300">Reps / distance<input maxLength={40} value={draft.reps} onChange={(event) => setDraft({ ...draft, reps: event.target.value })} className={inputClass} placeholder="8–12, 1 mile…" /></label><label className="text-sm font-medium text-slate-300">Minutes<input type="number" min="1" max="1440" inputMode="numeric" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} className={inputClass} placeholder="Optional" /></label><label className="text-sm font-medium text-slate-300">Exercise note<input maxLength={500} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className={inputClass} placeholder="Weight, tempo, variation…" /></label><div className="flex justify-end gap-2 md:col-span-2 xl:col-span-3"><button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-300">Cancel</button><button disabled={busy} className="min-h-11 rounded-lg bg-sky-400 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Add to plan"}</button></div></div></form>}
    <p className="mt-4 text-sm leading-5 text-slate-500">Use a comfortable range and load appropriate to your experience. Stop an exercise that causes pain, dizziness, or unusual symptoms, and get qualified guidance when needed.</p>
  </section>;
}
