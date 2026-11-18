"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  WORKOUT_ACTIVITIES,
  WORKOUT_INTENSITIES,
  estimateWorkoutCalories,
  workoutMet,
  type WorkoutActivityKey,
  type WorkoutCalorieSource,
  type WorkoutIntensity,
} from "@/lib/lifeos-workouts";
import type { PlannedWorkoutHandoff } from "@/lib/lifeos-exercises";

type WorkoutLog = {
  id: string;
  occurredAt: string;
  activityKey: WorkoutActivityKey;
  activityLabel: string;
  intensity: WorkoutIntensity;
  durationMinutes: number;
  bodyWeightLbs: number;
  met: number;
  estimatedCalories: number;
  caloriesBurned: number;
  calorieSource: WorkoutCalorieSource;
  notes: string;
  planId?: string;
};

type Draft = {
  planId: string;
  activityKey: WorkoutActivityKey;
  customActivity: string;
  intensity: WorkoutIntensity;
  performedAt: string;
  durationMinutes: string;
  bodyWeightLbs: string;
  manualCalories: string;
  notes: string;
};

function localDateTime(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 16);
}

function newDraft(bodyWeightLbs = ""): Draft {
  return { planId: "", activityKey: "STRENGTH", customActivity: "", intensity: "MODERATE", performedAt: localDateTime(), durationMinutes: "45", bodyWeightLbs, manualCalories: "", notes: "" };
}

const intensityLabels: Record<WorkoutIntensity, string> = { LIGHT: "Light", MODERATE: "Moderate", VIGOROUS: "Vigorous" };
const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-base text-slate-100 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/25";

export default function WorkoutTracker({ plannedWorkout = null, onWorkoutSaved }: { plannedWorkout?: PlannedWorkoutHandoff | null; onWorkoutSaved?: () => void }) {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [draft, setDraft] = useState<Draft>(() => newDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/lifeos/workouts?days=3650", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load workout history");
    const data = await response.json();
    const loaded = (data.workouts ?? []) as WorkoutLog[];
    setWorkouts(loaded);
    setDraft((current) => current.bodyWeightLbs || !loaded[0] ? current : { ...current, bodyWeightLbs: String(loaded[0].bodyWeightLbs) });
  }

  useEffect(() => { load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load workout history")); }, []);

  useEffect(() => {
    if (!plannedWorkout) return;
    const lastWeight = workouts[0]?.bodyWeightLbs;
    setDraft({
      planId: plannedWorkout.planId,
      activityKey: "OTHER",
      customActivity: plannedWorkout.title,
      intensity: "MODERATE",
      performedAt: `${plannedWorkout.scheduledFor}T09:00`,
      durationMinutes: String(plannedWorkout.durationMinutes),
      bodyWeightLbs: lastWeight ? String(lastWeight) : draft.bodyWeightLbs,
      manualCalories: "",
      notes: plannedWorkout.notes,
    });
    setEditingId(null);
    setEditorOpen(true);
    setError("");
    setNotice("Weekly plan loaded. Add your actual time, intensity, and weight, then save it to history.");
  }, [plannedWorkout]);

  const liveEstimate = useMemo(() => {
    const duration = Number(draft.durationMinutes);
    const weight = Number(draft.bodyWeightLbs);
    return estimateWorkoutCalories(workoutMet(draft.activityKey, draft.intensity), weight, duration);
  }, [draft.activityKey, draft.bodyWeightLbs, draft.durationMinutes, draft.intensity]);

  const recent = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    return workouts.filter((workout) => new Date(workout.occurredAt).valueOf() >= since);
  }, [workouts]);
  const totals = useMemo(() => recent.reduce((sum, workout) => ({ minutes: sum.minutes + workout.durationMinutes, calories: sum.calories + workout.caloriesBurned }), { minutes: 0, calories: 0 }), [recent]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workouts.filter((workout) => !query || `${workout.activityLabel} ${workout.intensity} ${workout.notes}`.toLowerCase().includes(query));
  }, [search, workouts]);

  function beginNew() {
    const lastWeight = workouts[0]?.bodyWeightLbs;
    setDraft(newDraft(lastWeight ? String(lastWeight) : draft.bodyWeightLbs));
    setEditingId(null);
    setEditorOpen(true);
    setError("");
    setNotice("");
    requestAnimationFrame(() => document.getElementById("workout-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function beginEdit(workout: WorkoutLog) {
    setDraft({ planId: workout.planId ?? "", activityKey: workout.activityKey, customActivity: workout.activityKey === "OTHER" ? workout.activityLabel : "", intensity: workout.intensity, performedAt: localDateTime(new Date(workout.occurredAt)), durationMinutes: String(workout.durationMinutes), bodyWeightLbs: String(workout.bodyWeightLbs), manualCalories: workout.calorieSource === "MANUAL" ? String(workout.caloriesBurned) : "", notes: workout.notes });
    setEditingId(workout.id);
    setEditorOpen(true);
    setError("");
    setNotice("");
    requestAnimationFrame(() => document.getElementById("workout-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const performedAt = new Date(draft.performedAt);
      if (Number.isNaN(performedAt.valueOf())) throw new Error("Choose a valid workout date and time");
      const response = await fetch("/api/lifeos/workouts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), ...draft, performedAt: performedAt.toISOString(), durationMinutes: Number(draft.durationMinutes), bodyWeightLbs: Number(draft.bodyWeightLbs), manualCalories: draft.manualCalories === "" ? "" : Number(draft.manualCalories) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Unable to save workout");
      await load();
      setEditorOpen(false);
      setEditingId(null);
      setNotice(editingId ? "Workout updated" : "Workout logged");
      onWorkoutSaved?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save workout");
    } finally {
      setBusy(false);
    }
  }

  async function remove(workout: WorkoutLog) {
    if (!confirm(`Remove ${workout.activityLabel} from your workout history?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lifeos/workouts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: workout.id }) });
      if (!response.ok) throw new Error("Unable to remove workout");
      await load();
      setNotice("Workout removed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove workout");
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-2xl border border-emerald-700/60 bg-emerald-950/15 p-4 sm:p-5" aria-labelledby="workout-tracker-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Health · Movement &amp; Fitness</p><h3 id="workout-tracker-heading" className="mt-1 text-xl font-semibold">Workout tracker</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">Log what you did, when, and for how long. Calories use a MET-based estimate from workout type, intensity, duration, and body weight; enter a device reading when you have a better number.</p></div>
      <button type="button" onClick={beginNew} className="min-h-11 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-300">+ Log workout</button>
    </div>

    {(error || notice) && <p role={error ? "alert" : "status"} className={`mt-4 rounded-xl border p-3 text-sm ${error ? "border-red-500/60 bg-red-950/30 text-red-200" : "border-emerald-500/50 bg-emerald-950/25 text-emerald-200"}`}>{error || notice}</p>}

    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Last 30 days</p><p className="mt-1 text-2xl font-semibold text-slate-100">{recent.length}</p><p className="text-sm text-slate-400">workouts</p></div>
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Time trained</p><p className="mt-1 text-2xl font-semibold text-slate-100">{totals.minutes}</p><p className="text-sm text-slate-400">minutes</p></div>
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Energy</p><p className="mt-1 text-2xl font-semibold text-slate-100">{totals.calories.toLocaleString()}</p><p className="text-sm text-slate-400">calories logged</p></div>
    </div>

    {editorOpen && <div id="workout-editor" className="mt-5 scroll-mt-8 rounded-xl border border-emerald-600/60 bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3"><div><h4 className="font-semibold text-slate-100">{editingId ? "Edit workout" : "Log a workout"}</h4>{draft.planId && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-sky-300">Loaded from weekly plan</p>}</div><button type="button" onClick={() => { setEditorOpen(false); setEditingId(null); }} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-300">Close</button></div>
      <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-medium text-slate-300">Workout<select value={draft.activityKey} onChange={(event) => setDraft({ ...draft, activityKey: event.target.value as WorkoutActivityKey })} className={inputClass}>{WORKOUT_ACTIVITIES.map((activity) => <option key={activity.key} value={activity.key}>{activity.label}</option>)}</select></label>
        {draft.activityKey === "OTHER" && <label className="text-sm font-medium text-slate-300">Workout name<input required maxLength={120} value={draft.customActivity} onChange={(event) => setDraft({ ...draft, customActivity: event.target.value })} className={inputClass} placeholder="Rucking, dance class…" /></label>}
        <label className="text-sm font-medium text-slate-300">Intensity<select value={draft.intensity} onChange={(event) => setDraft({ ...draft, intensity: event.target.value as WorkoutIntensity })} className={inputClass}>{WORKOUT_INTENSITIES.map((intensity) => <option key={intensity} value={intensity}>{intensityLabels[intensity]}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-300">When<input required type="datetime-local" value={draft.performedAt} onChange={(event) => setDraft({ ...draft, performedAt: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-slate-300">Duration (minutes)<input required type="number" min="1" max="1440" inputMode="numeric" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-slate-300">Body weight (lb)<input required type="number" min="40" max="1000" step="0.1" inputMode="decimal" value={draft.bodyWeightLbs} onChange={(event) => setDraft({ ...draft, bodyWeightLbs: event.target.value })} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">Used for this estimate and stored encrypted.</span></label>
        <label className="text-sm font-medium text-slate-300">Device calories <span className="font-normal text-slate-500">(optional)</span><input type="number" min="1" max="20000" inputMode="numeric" value={draft.manualCalories} onChange={(event) => setDraft({ ...draft, manualCalories: event.target.value })} className={inputClass} placeholder={liveEstimate ? `Estimated: ${liveEstimate}` : "Calculated automatically"} /></label>
        <label className="text-sm font-medium text-slate-300 md:col-span-2 xl:col-span-3">Notes<textarea rows={3} maxLength={2000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className={inputClass} placeholder="Exercises, sets, distance, how it felt…" /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 xl:col-span-3"><p className="text-sm text-slate-400">Current estimate: <strong className="text-emerald-300">{liveEstimate ? `${liveEstimate} calories` : "add weight and duration"}</strong></p><div className="flex gap-2"><button type="button" onClick={() => { setEditorOpen(false); setEditingId(null); }} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-300">Cancel</button><button disabled={busy} className="min-h-11 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : editingId ? "Save changes" : "Log workout"}</button></div></div>
      </form>
    </div>}

    <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><h4 className="font-semibold text-slate-100">Workout history</h4><p className="text-sm text-slate-500">Encrypted and visible only to the LifeOS owner.</p></div><label className="w-full text-sm font-medium text-slate-300 sm:w-72">Search history<input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Workout, intensity, notes…" /></label></div>
    <div className="mt-3 space-y-3">
      {visible.map((workout) => <article key={workout.id} className="rounded-xl border border-slate-700 bg-slate-950/65 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h5 className="font-semibold text-slate-100">{workout.activityLabel}</h5>{workout.planId && <span className="rounded-full border border-sky-800 px-2 py-1 text-xs font-semibold text-sky-300">Weekly plan</span>}</div><p className="mt-1 text-sm text-slate-400">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(workout.occurredAt))} · {workout.durationMinutes} min · {intensityLabels[workout.intensity]}</p></div><div className="text-right"><p className="text-lg font-semibold text-emerald-300">{workout.caloriesBurned.toLocaleString()} cal</p><p className="text-xs uppercase tracking-wide text-slate-500">{workout.calorieSource === "MANUAL" ? "Device / manual" : "Estimated"}</p></div></div>
        {workout.notes && <p className="mt-3 text-sm leading-6 text-slate-400">{workout.notes}</p>}
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => beginEdit(workout)} className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-300 hover:bg-slate-800">Edit</button><button type="button" disabled={busy} onClick={() => void remove(workout)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50">Remove</button></div>
      </article>)}
      {!visible.length && <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">{workouts.length ? "No workouts match that search." : "No workouts logged yet. Add your first session to begin the history."}</p>}
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-500">Calorie estimates use standard MET values and are directional, not clinical measurements. Individual energy use varies with fitness, body composition, technique, terrain, and other conditions.</p>
  </section>;
}
