"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import SemanticCalendar, { type CalendarGoal } from "./calendar";
import { LIFEOS_TIME_ZONE, chicagoLocalToUtc, utcToChicagoInput } from "@/lib/lifeos-time";
import { BLOCK_STATUSES, type BlockStatus, type TimeBlock } from "@/lib/lifeos-blocks";

type Goal = {
  id: string;
  title: string;
  horizon: string;
  parentId: string | null;
  done: boolean;
  completedAt: string | null;
  startAt: string | null;
  endAt: string | null;
};

type Review = {
  id: string;
  date: string;
  intended: string;
  actual: string;
  learned: string;
  next: string;
};

const horizons = ["LIFETIME", "PHASE", "YEAR", "SPRINT", "MONTH", "WEEK", "DAY", "HOUR"];

function localDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Workspace() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [horizon, setHorizon] = useState("SPRINT");
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editStartLocal, setEditStartLocal] = useState("");
  const [editEndLocal, setEditEndLocal] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStartLocal, setBlockStartLocal] = useState("");
  const [blockEndLocal, setBlockEndLocal] = useState("");
  const [blockObjectiveId, setBlockObjectiveId] = useState("");
  const [blockCategory, setBlockCategory] = useState("");
  const [blockNote, setBlockNote] = useState("");
  const [blockStatus, setBlockStatus] = useState<BlockStatus>("PLANNED");
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [date, setDate] = useState(() => localDateForInput(new Date()));
  const [intended, setIntended] = useState("");
  const [actual, setActual] = useState("");
  const [learned, setLearned] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading workspace…");
  const [busy, setBusy] = useState(false);

  const goalNames = useMemo(() => new Map(goals.map((goal) => [goal.id, goal.title])), [goals]);

  async function refresh() {
    const response = await fetch("/api/lifeos", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load your private workspace");
    const data = await response.json();
    setGoals(data.goals);
    setReviews(data.reviews);
    setBlocks(data.blocks ?? []);
  }

  useEffect(() => {
    refresh()
      .then(() => setStatus("Workspace loaded"))
      .catch((caught) => {
        setStatus("");
        setError(caught instanceof Error ? caught.message : "Unable to load your private workspace");
      });
  }, []);

  useEffect(() => {
    const review = reviews.find((candidate) => candidate.date.slice(0, 10) === date);
    setIntended(review?.intended ?? "");
    setActual(review?.actual ?? "");
    setLearned(review?.learned ?? "");
    setNext(review?.next ?? "");
  }, [date, reviews]);

  async function submit(body: object) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/lifeos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Unable to save");
      }
      await refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addGoal(event: FormEvent) {
    event.preventDefault();
    const schedule = scheduleValues(startLocal, endLocal);
    if (!schedule) return;
    const saved = await submit({ kind: "goal", title, horizon, parentId: parentId || null, ...schedule });
    if (saved) {
      setTitle("");
      setParentId("");
      setStartLocal("");
      setEndLocal("");
      setStatus("Objective saved");
    }
  }

  function scheduleValues(start: string, end: string) {
    if (!start && !end) return { startAt: null, endAt: null };
    const startAt = chicagoLocalToUtc(start);
    const endAt = chicagoLocalToUtc(end);
    if (!startAt || !endAt || new Date(startAt) >= new Date(endAt)) {
      setError(`Choose a valid start and end in ${LIFEOS_TIME_ZONE}; the end must be after the start.`);
      return null;
    }
    return { startAt, endAt };
  }

  function beginSchedule(goal: CalendarGoal) {
    setEditingScheduleId(goal.id);
    setEditStartLocal(goal.startAt ? utcToChicagoInput(goal.startAt) : "");
    setEditEndLocal(goal.endAt ? utcToChicagoInput(goal.endAt) : "");
    setError("");
    requestAnimationFrame(() => document.getElementById(`schedule-${goal.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function saveSchedule(goal: Goal, clear = false) {
    const schedule = clear ? { startAt: null, endAt: null } : scheduleValues(editStartLocal, editEndLocal);
    if (!schedule) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/lifeos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", id: goal.id, ...schedule }),
      });
      if (!response.ok) throw new Error("Unable to update schedule");
      await refresh();
      setEditingScheduleId(null);
      setStatus(clear ? "Objective returned to unscheduled" : "Objective schedule saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update schedule");
    } finally {
      setBusy(false);
    }
  }

  async function addReview(event: FormEvent) {
    event.preventDefault();
    const saved = await submit({ kind: "review", date, intended, actual, learned, next });
    if (saved) setStatus("Daily review saved");
  }

  function showBlockEditor(start: string, end: string, block?: TimeBlock) {
    setEditingBlockId(block?.id ?? null);
    setBlockTitle(block?.title ?? "");
    setBlockStartLocal(block ? utcToChicagoInput(block.startAt) : start);
    setBlockEndLocal(block ? utcToChicagoInput(block.endAt) : end);
    setBlockObjectiveId(block?.objectiveId ?? "");
    setBlockCategory(block?.category ?? "");
    setBlockNote(block?.note ?? "");
    setBlockStatus(block?.status ?? "PLANNED");
    setBlockEditorOpen(true);
    setError("");
    requestAnimationFrame(() => document.getElementById("block-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function setBlockDuration(minutes: number) {
    const startAt = chicagoLocalToUtc(blockStartLocal);
    if (!startAt) return;
    const end = new Date(new Date(startAt).valueOf() + minutes * 60_000);
    setBlockEndLocal(utcToChicagoInput(end.toISOString()));
  }

  async function saveBlock(event: FormEvent) {
    event.preventDefault();
    const schedule = scheduleValues(blockStartLocal, blockEndLocal);
    if (!schedule?.startAt || !schedule.endAt) return;
    const payload = {
      ...(editingBlockId ? { action: "block", id: editingBlockId } : { kind: "block" }),
      title: blockTitle,
      note: blockNote,
      category: blockCategory,
      status: blockStatus,
      objectiveId: blockObjectiveId || null,
      ...schedule,
    };
    const saved = editingBlockId
      ? await patch(payload, "Time block updated")
      : await submit(payload);
    if (saved) {
      setBlockEditorOpen(false);
      setEditingBlockId(null);
      setStatus(editingBlockId ? "Time block updated" : "Time block created");
    }
  }

  async function patch(body: object, success: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/lifeos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Unable to update");
      }
      await refresh();
      setStatus(success);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setTimeBlockStatus(block: TimeBlock, nextStatus: BlockStatus) {
    const saved = await patch({ action: "block-status", id: block.id, status: nextStatus }, nextStatus === "COMPLETED" ? "Time block completed" : nextStatus === "SKIPPED" ? "Time block skipped" : "Time block updated");
    if (saved && editingBlockId === block.id) setBlockStatus(nextStatus);
  }

  async function toggle(goal: Goal) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/lifeos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id, done: !goal.done }),
      });
      if (!response.ok) throw new Error("Unable to update goal");
      await refresh();
      setStatus(goal.done ? "Objective reopened" : "Objective completed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "lifeos-editable mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/40";
  const button =
    "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="lifeos-workspace-grid mt-5 grid gap-4 sm:gap-5 xl:gap-6">
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
      {error && (
        <p role="alert" className="lifeos-full-span rounded-lg border border-red-500 p-3 text-red-300">{error}</p>
      )}

      <SemanticCalendar
        goals={goals}
        blocks={blocks}
        onEditGoal={beginSchedule}
        onCreateBlock={(start, end) => showBlockEditor(start, end)}
        onEditBlock={(block) => showBlockEditor("", "", block)}
        onStatusBlock={setTimeBlockStatus}
      />

      {blockEditorOpen && (
        <section id="block-editor" aria-labelledby="block-editor-heading" className="lifeos-full-span scroll-mt-24 rounded-2xl border border-teal-600 bg-slate-900 p-4 shadow-2xl sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Daily execution</p>
              <h2 id="block-editor-heading" className="mt-1 text-xl font-semibold">{editingBlockId ? "Edit time block" : "Create time block"}</h2>
            </div>
            <button type="button" onClick={() => setBlockEditorOpen(false)} className={`${button} border border-slate-600 text-sm hover:bg-slate-800`}>Close</button>
          </div>
          <form onSubmit={saveBlock} className="lifeos-block-form mt-4 grid gap-4">
            <label className="block font-medium lifeos-block-title">Title
              <input required maxLength={180} autoFocus value={blockTitle} onChange={(event) => setBlockTitle(event.target.value)} className={input} />
            </label>
            <label className="block font-medium">Start
              <input required type="datetime-local" value={blockStartLocal} onChange={(event) => setBlockStartLocal(event.target.value)} className={input} />
            </label>
            <label className="block font-medium">End
              <input required type="datetime-local" value={blockEndLocal} onChange={(event) => setBlockEndLocal(event.target.value)} className={input} />
            </label>
            <div className="lifeos-block-duration">
              <span className="block font-medium">Duration</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {[30, 60, 90, 120].map((minutes) => <button key={minutes} type="button" onClick={() => setBlockDuration(minutes)} className={`${button} border border-slate-600 text-sm hover:bg-slate-800`}>{minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}</button>)}
              </div>
            </div>
            <label className="block font-medium">Linked objective
              <select value={blockObjectiveId} onChange={(event) => setBlockObjectiveId(event.target.value)} className={input}>
                <option value="">None</option>
                {goals.filter((goal) => !goal.done).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
              </select>
            </label>
            <label className="block font-medium">Category
              <input maxLength={60} placeholder="Deep work, admin, health…" value={blockCategory} onChange={(event) => setBlockCategory(event.target.value)} className={input} />
            </label>
            <label className="block font-medium">Status
              <select value={blockStatus} onChange={(event) => setBlockStatus(event.target.value as BlockStatus)} className={input}>
                {BLOCK_STATUSES.map((item) => <option key={item} value={item}>{item.replace("_", " ").toLowerCase()}</option>)}
              </select>
            </label>
            <label className="lifeos-block-note block font-medium">Short note
              <textarea maxLength={1000} rows={2} value={blockNote} onChange={(event) => setBlockNote(event.target.value)} className={input} />
            </label>
            <div className="lifeos-block-actions flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={`${button} bg-teal-400 text-slate-950 hover:bg-teal-300`}>{editingBlockId ? "Save changes" : "Create block"}</button>
              {editingBlockId && blockStatus !== "COMPLETED" && <button type="button" disabled={busy} onClick={() => { const found = blocks.find((block) => block.id === editingBlockId); if (found) setTimeBlockStatus(found, "COMPLETED"); }} className={`${button} border border-slate-600 hover:bg-slate-800`}>Complete</button>}
              {editingBlockId && blockStatus !== "SKIPPED" && <button type="button" disabled={busy} onClick={() => { const found = blocks.find((block) => block.id === editingBlockId); if (found) setTimeBlockStatus(found, "SKIPPED"); }} className={`${button} border border-slate-600 hover:bg-slate-800`}>Skip</button>}
              <button type="button" onClick={() => setBlockEditorOpen(false)} className={`${button} border border-slate-600 hover:bg-slate-800`}>Cancel</button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-400">Times display in {LIFEOS_TIME_ZONE}. Overlapping blocks are allowed and appear side by side.</p>
        </section>
      )}

      <section id="planning" aria-labelledby="planning-heading" className="lifeos-panel scroll-mt-24 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5 xl:p-6">
        <h2 id="planning-heading" className="text-xl font-semibold">Planning workspace</h2>
        <p className="mt-2 text-sm text-slate-400">Create outcomes across time horizons and connect them to a parent goal.</p>
        <form onSubmit={addGoal} className="lifeos-planning-form mt-4 space-y-4">
          <label className="block font-medium">
            Objective
            <input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className={input} />
          </label>
          <div className="lifeos-form-pair grid gap-4">
            <label className="block font-medium">Horizon
              <select value={horizon} onChange={(event) => setHorizon(event.target.value)} className={input}>
                {horizons.map((item) => <option key={item} value={item}>{item === "SPRINT" ? "13-week sprint" : item.toLowerCase()}</option>)}
              </select>
            </label>
            <label className="block font-medium">Parent objective
              <select value={parentId} onChange={(event) => setParentId(event.target.value)} className={input}>
                <option value="">None</option>
                {goals.filter((goal) => !goal.done).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="rounded-xl border border-slate-700 p-4">
            <legend className="px-1 font-medium">Schedule (optional)</legend>
            <p className="mb-3 text-sm text-slate-400">Leave both blank to keep this objective unscheduled. Times use {LIFEOS_TIME_ZONE}.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Start
                <input type="datetime-local" value={startLocal} onChange={(event) => setStartLocal(event.target.value)} className={input} />
              </label>
              <label className="block text-sm font-medium">
                End
                <input type="datetime-local" value={endLocal} onChange={(event) => setEndLocal(event.target.value)} className={input} />
              </label>
            </div>
          </fieldset>
          <button type="submit" disabled={busy} className={`${button} bg-teal-400 text-slate-950 hover:bg-teal-300`}>Save objective</button>
        </form>

        <h3 className="mt-7 font-semibold">Objectives</h3>
        <div className="lifeos-objectives-list mt-3 space-y-3">
          {goals.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No objectives yet.</p>}
          {goals.map((goal) => (
            <article key={goal.id} className="rounded-lg border border-slate-700 p-4">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className={`break-words ${goal.done ? "text-slate-400 line-through" : "font-semibold"}`}>{goal.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {goal.horizon}{goal.parentId ? ` · Parent: ${goalNames.get(goal.parentId) ?? "unavailable"}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {goal.startAt && goal.endAt
                      ? `${new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(goal.startAt))} → ${new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(goal.endAt))}`
                      : "Unscheduled"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => beginSchedule(goal)} className={`${button} shrink-0 border border-slate-600 text-sm hover:bg-slate-800`}>Edit schedule</button>
                  <button type="button" disabled={busy} onClick={() => toggle(goal)} className={`${button} shrink-0 border border-slate-600 text-sm hover:bg-slate-800`}>
                    {goal.done ? "Reopen" : "Complete"}
                  </button>
                </div>
              </div>
              {editingScheduleId === goal.id && (
                <div id={`schedule-${goal.id}`} className="mt-4 rounded-xl border border-teal-800 bg-slate-950/60 p-4">
                  <h4 className="font-semibold">Edit schedule</h4>
                  <p className="mt-1 text-xs text-slate-400">{LIFEOS_TIME_ZONE}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">Start<input type="datetime-local" value={editStartLocal} onChange={(event) => setEditStartLocal(event.target.value)} className={input} /></label>
                    <label className="text-sm font-medium">End<input type="datetime-local" value={editEndLocal} onChange={(event) => setEditEndLocal(event.target.value)} className={input} /></label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => saveSchedule(goal)} className={`${button} bg-teal-400 text-slate-950`}>Save schedule</button>
                    {(goal.startAt || goal.endAt) && <button type="button" disabled={busy} onClick={() => saveSchedule(goal, true)} className={`${button} border border-slate-600`}>Clear schedule</button>}
                    <button type="button" onClick={() => setEditingScheduleId(null)} className={`${button} border border-slate-600`}>Cancel</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="aar" aria-labelledby="review-heading" className="lifeos-panel scroll-mt-24 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5 xl:p-6">
        <h2 id="review-heading" className="text-xl font-semibold">Daily After Action Review</h2>
        <p className="mt-2 text-sm text-slate-400">Choosing a saved date loads that review for editing.</p>
        <form onSubmit={addReview} className="lifeos-aar-form mt-4 space-y-4">
          <label className="block font-medium">
            Date
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={input} />
          </label>
          <div className="lifeos-aar-grid grid gap-4">{([
            ["What was intended?", intended, setIntended],
            ["What actually happened?", actual, setActual],
            ["What did you learn?", learned, setLearned],
            ["What changes next?", next, setNext],
          ] as const).map(([label, value, setter]) => (
            <label key={label} className="block font-medium">
              {label}
              <textarea maxLength={4000} value={value} onChange={(event) => setter(event.target.value)} className={input} rows={2} />
            </label>
          ))}</div>
          <button type="submit" disabled={busy} className={`${button} bg-teal-400 text-slate-950 hover:bg-teal-300`}>Save AAR</button>
        </form>

        <h3 className="mt-7 font-semibold">Recent reviews</h3>
        <div className="mt-3 space-y-2">
          {reviews.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No reviews yet.</p>}
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => setDate(review.date.slice(0, 10))}
              className="block min-h-11 w-full touch-manipulation rounded-lg border border-slate-700 p-3 text-left hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              <span className="font-semibold">{review.date.slice(0, 10)}</span>
              <span className="mt-1 block break-words text-sm text-slate-300">{review.learned || review.actual || "Review saved"}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
