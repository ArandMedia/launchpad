"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import SemanticCalendar, { type CalendarGoal } from "./calendar";
import { LIFEOS_TIME_ZONE, chicagoLocalToUtc, utcToChicagoInput } from "@/lib/lifeos-time";
import { BLOCK_STATUSES, type BlockStatus, type TimeBlock } from "@/lib/lifeos-blocks";
import { DOMAIN_LABELS, LIFEOS_DOMAINS, type LifeOSDomainKey } from "@/lib/lifeos-domains";
import type { ExternalCalendarEvent } from "@/lib/calendar-feeds";

type Goal = {
  id: string;
  title: string;
  horizon: string;
  parentId: string | null;
  done: boolean;
  completedAt: string | null;
  startAt: string | null;
  endAt: string | null;
  domainKey: LifeOSDomainKey;
};

type Review = {
  id: string;
  date: string;
  intended: string;
  actual: string;
  learned: string;
  next: string;
};

type ProjectAgendaItem = {
  kind: "TASK" | "MILESTONE";
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  clientName: string;
  dueAt: string | null;
  scheduledBlocks: { id: string; startAt: string; endAt: string; status: BlockStatus }[];
};

const horizons = ["LIFETIME", "PHASE", "YEAR", "SPRINT", "MONTH", "WEEK", "DAY", "HOUR"];

function localDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Workspace({ mode = "today" }: { mode?: "today" | "timeline" | "reviews" }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);
  const [projectAgenda, setProjectAgenda] = useState<ProjectAgendaItem[]>([]);
  const [projectAgendaOpen, setProjectAgendaOpen] = useState(false);
  const [horizon, setHorizon] = useState("SPRINT");
  const [goalDomainKey, setGoalDomainKey] = useState<LifeOSDomainKey>("OMNIS");
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
  const [blockProjectId, setBlockProjectId] = useState("");
  const [blockTaskId, setBlockTaskId] = useState("");
  const [blockMilestoneId, setBlockMilestoneId] = useState("");
  const [blockProjectName, setBlockProjectName] = useState("");
  const [blockClientName, setBlockClientName] = useState("");
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState(false);
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
    const [response, calendarResponse, agendaResponse] = await Promise.all([
      fetch("/api/lifeos", { cache: "no-store" }),
      fetch("/api/lifeos/calendar-feeds", { cache: "no-store" }),
      fetch("/api/lifeos/project-agenda", { cache: "no-store" }),
    ]);
    if (!response.ok) throw new Error("Unable to load your private workspace");
    const [data, calendarData, agendaData] = await Promise.all([
      response.json(),
      calendarResponse.ok ? calendarResponse.json() : Promise.resolve({ events: [] }),
      agendaResponse.ok ? agendaResponse.json() : Promise.resolve({ items: [] }),
    ]);
    setGoals(data.goals);
    setReviews(data.reviews);
    setBlocks(data.blocks ?? []);
    setExternalEvents(calendarData.events ?? []);
    setProjectAgenda(agendaData.items ?? []);
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
    const timer = window.setInterval(() => {
      fetch("/api/lifeos/calendar-feeds", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (data) setExternalEvents(data.events ?? []); })
        .catch(() => undefined);
    }, 5 * 60_000);
    return () => window.clearInterval(timer);
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
    const saved = await submit({ kind: "goal", title, horizon, domainKey: goalDomainKey, parentId: parentId || null, ...schedule });
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
    setBlockProjectId(block?.projectId ?? "");
    setBlockTaskId(block?.taskId ?? "");
    setBlockMilestoneId(block?.milestoneId ?? "");
    setBlockProjectName(block?.projectName ?? "");
    setBlockClientName(block?.clientName ?? "");
    setBlockEditorOpen(true);
    setConfirmDeleteBlock(false);
    setError("");
    requestAnimationFrame(() => document.getElementById("block-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function scheduleProjectItem(item: ProjectAgendaItem) {
    const now = new Date();
    const rounded = new Date(Math.ceil(now.valueOf() / (30 * 60_000)) * 30 * 60_000);
    const end = new Date(rounded.valueOf() + 60 * 60_000);
    setEditingBlockId(null);
    setBlockTitle(item.title);
    setBlockStartLocal(utcToChicagoInput(rounded));
    setBlockEndLocal(utcToChicagoInput(end));
    setBlockObjectiveId("");
    setBlockCategory("Project work");
    setBlockNote(`${item.clientName} · ${item.projectName}`);
    setBlockStatus("PLANNED");
    setBlockProjectId(item.projectId);
    setBlockTaskId(item.kind === "TASK" ? item.id : "");
    setBlockMilestoneId(item.kind === "MILESTONE" ? item.id : "");
    setBlockProjectName(item.projectName);
    setBlockClientName(item.clientName);
    setProjectAgendaOpen(false);
    setBlockEditorOpen(true);
    setConfirmDeleteBlock(false);
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
      projectId: blockProjectId || null,
      taskId: blockTaskId || null,
      milestoneId: blockMilestoneId || null,
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

  async function deleteTimeBlock() {
    if (!editingBlockId) return;
    const deleted = await patchRequest("DELETE", { id: editingBlockId }, "Time block deleted");
    if (deleted) {
      setBlockEditorOpen(false);
      setEditingBlockId(null);
      setConfirmDeleteBlock(false);
    }
  }

  async function patchRequest(method: "DELETE", body: object, success: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/lifeos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Unable to delete time block");
      await refresh();
      setStatus(success);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete time block");
      return false;
    } finally {
      setBusy(false);
    }
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
    "lifeos-editable mt-1 min-w-0 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/40";
  const button =
    "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="lifeos-workspace-grid mt-5 grid gap-4 sm:gap-5 xl:gap-6">
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
      {error && (
        <p role="alert" className="lifeos-full-span rounded-lg border border-red-500 p-3 text-red-300">{error}</p>
      )}

      {mode !== "reviews" && (
        <section aria-labelledby="project-agenda-heading" className="lifeos-full-span rounded-2xl border border-slate-700 bg-slate-900 p-2 sm:p-3">
          <h2 id="project-agenda-heading" className="sr-only">Project agenda</h2>
          <button
            type="button"
            aria-expanded={projectAgendaOpen}
            aria-controls="project-agenda-items"
            onClick={() => setProjectAgendaOpen((open) => !open)}
            className="flex min-h-14 w-full touch-manipulation items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="text-xl text-violet-300">☰</span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-100">Project agenda</span>
                <span className="block truncate text-xs text-slate-400">{projectAgenda.length} open · {projectAgenda.filter((item) => item.scheduledBlocks.length === 0).length} unscheduled</span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-violet-300">{projectAgendaOpen ? "Hide" : "Show"} <span aria-hidden="true">{projectAgendaOpen ? "↑" : "↓"}</span></span>
          </button>
          {projectAgendaOpen && <div id="project-agenda-items" className="mt-2 border-t border-slate-700 px-2 pb-2 pt-4 sm:px-3">
            <p className="text-sm leading-6 text-slate-400">Open tasks and milestones from internal and client projects. Schedule focused work without marking the underlying item complete.</p>
            {projectAgenda.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No open project tasks or milestones need scheduling.</p>
            ) : (
            <div className="mt-3 grid max-h-[32rem] gap-3 overflow-y-auto overscroll-contain pr-1 lg:grid-cols-2">
              {projectAgenda.map((item) => {
                const nextBlock = item.scheduledBlocks[0];
                return <article key={`${item.kind}:${item.id}`} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{item.clientName} · {item.kind.toLowerCase()}</p>
                      <h3 className="mt-1 break-words font-semibold text-slate-100">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{item.projectName}</p>
                    </div>
                    <button type="button" onClick={() => scheduleProjectItem(item)} className={`${button} shrink-0 bg-violet-400 text-slate-950 hover:bg-violet-300`}>{nextBlock ? "Schedule more" : "Schedule"}</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>{item.dueAt ? `Due ${new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, month: "short", day: "numeric", year: "numeric" }).format(new Date(item.dueAt))}` : "No due date"}</span>
                    <span>{nextBlock ? `${item.scheduledBlocks.length} block${item.scheduledBlocks.length === 1 ? "" : "s"} · next ${new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(nextBlock.startAt))}` : "Not scheduled yet"}</span>
                  </div>
                </article>;
              })}
            </div>
            )}
          </div>}
        </section>
      )}

      {mode !== "reviews" && <SemanticCalendar
        goals={goals}
        blocks={blocks}
        externalEvents={externalEvents}
        initialLevel={mode === "timeline" ? "LIFE" : "DAY"}
        onEditGoal={beginSchedule}
        onCreateBlock={(start, end) => showBlockEditor(start, end)}
        onEditBlock={(block) => showBlockEditor("", "", block)}
        onStatusBlock={setTimeBlockStatus}
      />}

      {mode !== "reviews" && blockEditorOpen && (
        <section id="block-editor" aria-labelledby="block-editor-heading" className="lifeos-full-span scroll-mt-24 rounded-2xl border border-violet-600 bg-slate-900 p-4 shadow-2xl sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Daily execution</p>
              <h2 id="block-editor-heading" className="mt-1 text-xl font-semibold">{editingBlockId ? "Edit time block" : "Create time block"}</h2>
            </div>
            <button type="button" onClick={() => setBlockEditorOpen(false)} className={`${button} border border-slate-600 text-sm hover:bg-slate-800`}>Close</button>
          </div>
          <form onSubmit={saveBlock} className="lifeos-block-form mt-4 grid gap-4">
            {blockProjectId && <div className="lifeos-block-title rounded-xl border border-violet-700 bg-violet-950/35 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Linked project work</p>
              <p className="mt-1 font-semibold">{blockProjectName}</p>
              <p className="text-sm text-slate-400">{blockClientName} · Completing this block records the work session only.</p>
            </div>}
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
              <button type="submit" disabled={busy} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>{editingBlockId ? "Save changes" : "Create block"}</button>
              {editingBlockId && blockStatus !== "COMPLETED" && <button type="button" disabled={busy} onClick={() => { const found = blocks.find((block) => block.id === editingBlockId); if (found) setTimeBlockStatus(found, "COMPLETED"); }} className={`${button} border border-slate-600 hover:bg-slate-800`}>Complete</button>}
              {editingBlockId && blockStatus !== "SKIPPED" && <button type="button" disabled={busy} onClick={() => { const found = blocks.find((block) => block.id === editingBlockId); if (found) setTimeBlockStatus(found, "SKIPPED"); }} className={`${button} border border-slate-600 hover:bg-slate-800`}>Skip</button>}
              {editingBlockId && !confirmDeleteBlock && <button type="button" disabled={busy} onClick={() => setConfirmDeleteBlock(true)} className={`${button} border border-red-700 text-red-300 hover:bg-red-950/50`}>Delete block</button>}
              {editingBlockId && confirmDeleteBlock && <span className="flex flex-wrap items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 p-2">
                <span className="text-sm text-red-200">Delete permanently?</span>
                <button type="button" disabled={busy} onClick={deleteTimeBlock} className={`${button} bg-red-500 text-white hover:bg-red-400`}>Confirm delete</button>
                <button type="button" onClick={() => setConfirmDeleteBlock(false)} className={`${button} border border-slate-600 hover:bg-slate-800`}>Keep block</button>
              </span>}
              <button type="button" onClick={() => setBlockEditorOpen(false)} className={`${button} border border-slate-600 hover:bg-slate-800`}>Cancel</button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-400">Times display in {LIFEOS_TIME_ZONE}. Overlapping blocks are allowed and appear side by side.</p>
        </section>
      )}

      {mode === "timeline" && <section id="planning" aria-labelledby="planning-heading" className="lifeos-panel lifeos-full-span scroll-mt-24 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5 xl:p-6">
        <h2 id="planning-heading" className="text-xl font-semibold">Planning workspace</h2>
        <p className="mt-2 text-sm text-slate-400">Create outcomes across time horizons and connect them to a parent goal.</p>
        <form onSubmit={addGoal} className="lifeos-planning-form mt-4 space-y-4">
          <label className="block font-medium">
            Objective
            <input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className={input} />
          </label>
          <div className="lifeos-form-pair grid gap-4">
            <label className="block font-medium">Domain
              <select value={goalDomainKey} onChange={(event) => setGoalDomainKey(event.target.value as LifeOSDomainKey)} className={input}>
                {LIFEOS_DOMAINS.map((item) => <option key={item} value={item}>{DOMAIN_LABELS[item]}</option>)}
              </select>
            </label>
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
            <div className="grid gap-4">
              <label className="block min-w-0 text-sm font-medium">
                Start
                <input type="datetime-local" value={startLocal} onChange={(event) => setStartLocal(event.target.value)} className={input} />
              </label>
              <label className="block min-w-0 text-sm font-medium">
                End
                <input type="datetime-local" value={endLocal} onChange={(event) => setEndLocal(event.target.value)} className={input} />
              </label>
            </div>
          </fieldset>
          <button type="submit" disabled={busy} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>Save objective</button>
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
                    {DOMAIN_LABELS[goal.domainKey] ?? goal.domainKey} · {goal.horizon}{goal.parentId ? ` · Parent: ${goalNames.get(goal.parentId) ?? "unavailable"}` : ""}
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
                <div id={`schedule-${goal.id}`} className="mt-4 rounded-xl border border-violet-800 bg-slate-950/60 p-4">
                  <h4 className="font-semibold">Edit schedule</h4>
                  <p className="mt-1 text-xs text-slate-400">{LIFEOS_TIME_ZONE}</p>
                  <div className="mt-3 grid gap-4">
                    <label className="block min-w-0 text-sm font-medium">Start<input type="datetime-local" value={editStartLocal} onChange={(event) => setEditStartLocal(event.target.value)} className={input} /></label>
                    <label className="block min-w-0 text-sm font-medium">End<input type="datetime-local" value={editEndLocal} onChange={(event) => setEditEndLocal(event.target.value)} className={input} /></label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => saveSchedule(goal)} className={`${button} bg-violet-400 text-slate-950`}>Save schedule</button>
                    {(goal.startAt || goal.endAt) && <button type="button" disabled={busy} onClick={() => saveSchedule(goal, true)} className={`${button} border border-slate-600`}>Clear schedule</button>}
                    <button type="button" onClick={() => setEditingScheduleId(null)} className={`${button} border border-slate-600`}>Cancel</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>}

      {mode === "reviews" && <section id="aar" aria-labelledby="review-heading" className="lifeos-panel lifeos-full-span scroll-mt-24 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5 xl:p-6">
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
          <button type="submit" disabled={busy} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>Save AAR</button>
        </form>

        <h3 className="mt-7 font-semibold">Recent reviews</h3>
        <div className="mt-3 space-y-2">
          {reviews.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No reviews yet.</p>}
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => setDate(review.date.slice(0, 10))}
              className="block min-h-11 w-full touch-manipulation rounded-lg border border-slate-700 p-3 text-left hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
            >
              <span className="font-semibold">{review.date.slice(0, 10)}</span>
              <span className="mt-1 block break-words text-sm text-slate-300">{review.learned || review.actual || "Review saved"}</span>
            </button>
          ))}
        </div>
      </section>}
    </div>
  );
}
