"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  decisionItemKey,
  type DecisionQuadrant,
  type DecisionSourceKind,
} from "@/lib/decision-matrix";
import { LIFEOS_TIME_ZONE } from "@/lib/lifeos-time";

type DecisionItem = {
  sourceKind: DecisionSourceKind;
  sourceId: string;
  title: string;
  context: string;
  dueAt: string | null;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  quadrant: DecisionQuadrant | null;
};

type MatrixData = { date: string; items: DecisionItem[] };
type DueFilter = "ALL" | "OVERDUE" | "TODAY" | "NEXT_7_DAYS" | "NO_DUE_DATE";
type SortMode = "DUE_SOON" | "PROJECT" | "CLIENT" | "TITLE" | "NEWEST";

const quadrants: Array<{
  id: DecisionQuadrant;
  number: string;
  title: string;
  axis: string;
  guidance: string;
  tone: string;
}> = [
  { id: "DO_NOW", number: "1", title: "Do now", axis: "Urgent + important", guidance: "Protect time and act today.", tone: "border-rose-500/60 bg-rose-950/20" },
  { id: "SCHEDULE", number: "2", title: "Schedule", axis: "Important + not urgent", guidance: "Decide when this will move.", tone: "border-violet-500/60 bg-violet-950/20" },
  { id: "DELEGATE", number: "3", title: "Delegate", axis: "Urgent + not important", guidance: "Assign, automate, or shorten it.", tone: "border-amber-500/60 bg-amber-950/20" },
  { id: "ELIMINATE", number: "4", title: "Eliminate or defer", axis: "Not urgent + not important", guidance: "Question whether this belongs today.", tone: "border-slate-600 bg-slate-900/70" },
];

function localToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIFEOS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function sourceLabel(kind: DecisionSourceKind) {
  if (kind === "PROJECT_TASK") return "Project task";
  if (kind === "MILESTONE") return "Milestone";
  return "Next action";
}

function dueLabel(value: string | null) {
  if (!value) return "No due date";
  return `Due ${new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, month: "short", day: "numeric", year: "numeric" }).format(new Date(value))}`;
}

function localDateForInstant(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIFEOS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addCalendarDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function DecisionMatrixWorkspace() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [draggingKey, setDraggingKey] = useState("");
  const [hoverQuadrant, setHoverQuadrant] = useState<DecisionQuadrant | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | DecisionSourceKind>("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState<DueFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("DUE_SOON");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const dragKeyRef = useRef("");

  async function load() {
    setError("");
    const response = await fetch("/api/lifeos/decision-matrix", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load today’s decision matrix");
    setData(await response.json());
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load today’s decision matrix"));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (data && data.date !== localToday()) {
        setSelectedKey("");
        load().catch(() => setError("A new day started, but the fresh matrix could not load."));
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [data]);

  const selectedItem = data?.items.find((item) => decisionItemKey(item.sourceKind, item.sourceId) === selectedKey) ?? null;
  const draggingItem = data?.items.find((item) => decisionItemKey(item.sourceKind, item.sourceId) === draggingKey) ?? null;
  const unplacedItems = useMemo(() => (data?.items ?? []).filter((item) => !item.quadrant), [data]);
  const projectOptions = useMemo(() => {
    const projects = new Map<string, { id: string; name: string; clientName: string; count: number }>();
    for (const item of data?.items ?? []) {
      if (!item.projectId || !item.projectName) continue;
      const existing = projects.get(item.projectId);
      projects.set(item.projectId, {
        id: item.projectId,
        name: item.projectName,
        clientName: item.clientName ?? "",
        count: (existing?.count ?? 0) + (item.quadrant ? 0 : 1),
      });
    }
    return [...projects.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [data]);
  const clientOptions = useMemo(() => {
    const clients = new Map<string, { id: string; name: string; count: number }>();
    for (const item of data?.items ?? []) {
      if (!item.clientId || !item.clientName) continue;
      const existing = clients.get(item.clientId);
      clients.set(item.clientId, { id: item.clientId, name: item.clientName, count: (existing?.count ?? 0) + (item.quadrant ? 0 : 1) });
    }
    return [...clients.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [data]);
  const pool = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = data?.date ?? localToday();
    const nextWeek = addCalendarDays(today, 7);
    const filtered = unplacedItems.filter((item) => {
      if (sourceFilter !== "ALL" && item.sourceKind !== sourceFilter) return false;
      if (projectFilter !== "ALL" && item.projectId !== projectFilter) return false;
      if (clientFilter !== "ALL" && item.clientId !== clientFilter) return false;
      const dueDate = item.dueAt ? localDateForInstant(item.dueAt) : null;
      if (dueFilter === "OVERDUE" && (!dueDate || dueDate >= today)) return false;
      if (dueFilter === "TODAY" && dueDate !== today) return false;
      if (dueFilter === "NEXT_7_DAYS" && (!dueDate || dueDate < today || dueDate > nextWeek)) return false;
      if (dueFilter === "NO_DUE_DATE" && dueDate) return false;
      return !query || item.title.toLowerCase().includes(query) || item.context.toLowerCase().includes(query);
    });
    return filtered.sort((left, right) => {
      if (sortMode === "TITLE") return left.title.localeCompare(right.title);
      if (sortMode === "PROJECT") return (left.projectName ?? "zzzz").localeCompare(right.projectName ?? "zzzz") || left.title.localeCompare(right.title);
      if (sortMode === "CLIENT") return (left.clientName ?? "zzzz").localeCompare(right.clientName ?? "zzzz") || left.title.localeCompare(right.title);
      if (sortMode === "NEWEST") return new Date(right.createdAt).valueOf() - new Date(left.createdAt).valueOf();
      if (left.dueAt && right.dueAt) return new Date(left.dueAt).valueOf() - new Date(right.dueAt).valueOf();
      if (left.dueAt) return -1;
      if (right.dueAt) return 1;
      return left.title.localeCompare(right.title);
    });
  }, [clientFilter, data?.date, dueFilter, projectFilter, search, sortMode, sourceFilter, unplacedItems]);
  const activeFilterCount = [sourceFilter !== "ALL", projectFilter !== "ALL", clientFilter !== "ALL", dueFilter !== "ALL"].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setSourceFilter("ALL");
    setProjectFilter("ALL");
    setClientFilter("ALL");
    setDueFilter("ALL");
    setSortMode("DUE_SOON");
  }

  async function move(item: DecisionItem, quadrant: DecisionQuadrant | null) {
    if (!data) return;
    const key = decisionItemKey(item.sourceKind, item.sourceId);
    const previous = item.quadrant;
    setBusyKey(key);
    setError("");
    setData({ ...data, items: data.items.map((candidate) => decisionItemKey(candidate.sourceKind, candidate.sourceId) === key ? { ...candidate, quadrant } : candidate) });
    try {
      const response = await fetch("/api/lifeos/decision-matrix", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: data.date, sourceKind: item.sourceKind, sourceId: item.sourceId, quadrant }),
      });
      if (!response.ok) throw new Error("Unable to move that item");
      setSelectedKey("");
    } catch (caught) {
      setData((current) => current ? { ...current, items: current.items.map((candidate) => decisionItemKey(candidate.sourceKind, candidate.sourceId) === key ? { ...candidate, quadrant: previous } : candidate) } : current);
      setError(caught instanceof Error ? caught.message : "Unable to move that item");
    } finally {
      setBusyKey("");
    }
  }

  function quadrantAt(x: number, y: number) {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-quadrant]");
    const value = element?.dataset.quadrant;
    return quadrants.some((quadrant) => quadrant.id === value) ? value as DecisionQuadrant : null;
  }

  function beginPointerDrag(event: PointerEvent<HTMLButtonElement>, item: DecisionItem) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const key = decisionItemKey(item.sourceKind, item.sourceId);
    dragKeyRef.current = key;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingKey(key);
    setDragPoint({ x: event.clientX, y: event.clientY });
    setHoverQuadrant(quadrantAt(event.clientX, event.clientY));
  }

  function updatePointerDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragKeyRef.current) return;
    setDragPoint({ x: event.clientX, y: event.clientY });
    setHoverQuadrant(quadrantAt(event.clientX, event.clientY));
  }

  function finishPointerDrag(event: PointerEvent<HTMLButtonElement>, item: DecisionItem) {
    if (!dragKeyRef.current) return;
    const quadrant = quadrantAt(event.clientX, event.clientY);
    dragKeyRef.current = "";
    setDraggingKey("");
    setDragPoint(null);
    setHoverQuadrant(null);
    if (quadrant) void move(item, quadrant);
  }

  function beginNativeDrag(event: DragEvent<HTMLElement>, item: DecisionItem) {
    const key = decisionItemKey(item.sourceKind, item.sourceId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
    setDraggingKey(key);
  }

  function nativeDrop(event: DragEvent<HTMLElement>, quadrant: DecisionQuadrant) {
    event.preventDefault();
    const key = event.dataTransfer.getData("text/plain") || draggingKey;
    const item = data?.items.find((candidate) => decisionItemKey(candidate.sourceKind, candidate.sourceId) === key);
    setDraggingKey("");
    setHoverQuadrant(null);
    if (item) void move(item, quadrant);
  }

  function TaskCard({ item, inMatrix = false }: { item: DecisionItem; inMatrix?: boolean }) {
    const key = decisionItemKey(item.sourceKind, item.sourceId);
    const selected = selectedKey === key;
    return <article
      draggable
      onDragStart={(event) => beginNativeDrag(event, item)}
      onDragEnd={() => { setDraggingKey(""); setHoverQuadrant(null); }}
      className={`rounded-xl border p-3 transition ${selected ? "border-violet-300 bg-violet-950/60 ring-2 ring-violet-300/30" : "border-slate-700 bg-slate-950/75"} ${busyKey === key ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={`Drag ${item.title}`}
          title="Drag to a quadrant"
          onPointerDown={(event) => beginPointerDrag(event, item)}
          onPointerMove={updatePointerDrag}
          onPointerUp={(event) => finishPointerDrag(event, item)}
          onPointerCancel={() => { dragKeyRef.current = ""; setDraggingKey(""); setDragPoint(null); setHoverQuadrant(null); }}
          className="touch-none shrink-0 cursor-grab rounded-lg border border-slate-600 px-2 py-2 text-lg leading-none text-violet-300 active:cursor-grabbing"
        >
          ⠿
        </button>
        <button type="button" onClick={() => setSelectedKey(selected ? "" : key)} className="min-w-0 flex-1 text-left">
          <span className="block break-words font-semibold text-slate-100">{item.title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">{item.context}</span>
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
            <span>{sourceLabel(item.sourceKind)}</span><span>{dueLabel(item.dueAt)}</span>
          </span>
        </button>
      </div>
      {inMatrix && <button type="button" disabled={busyKey === key} onClick={() => void move(item, null)} className="mt-3 min-h-10 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50">Return to task pool</button>}
    </article>;
  }

  return <div className="mt-5 space-y-5">
    {error && <p role="alert" className="rounded-xl border border-red-500/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="matrix-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Today · {data?.date ?? localToday()}</p>
          <h3 id="matrix-heading" className="mt-1 text-xl font-semibold">What deserves attention today?</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">Drag by the dotted handle, or select a card and tap “Place selected here.” Categorizing does not complete, delete, or reassign the underlying task.</p>
        </div>
        <p className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400">Fresh matrix every day</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {quadrants.map((quadrant) => {
          const items = data?.items.filter((item) => item.quadrant === quadrant.id) ?? [];
          const active = hoverQuadrant === quadrant.id;
          return <section
            key={quadrant.id}
            data-quadrant={quadrant.id}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setHoverQuadrant(quadrant.id); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoverQuadrant(null); }}
            onDrop={(event) => nativeDrop(event, quadrant.id)}
            className={`min-h-64 rounded-2xl border p-4 transition ${quadrant.tone} ${active ? "scale-[1.01] border-violet-300 ring-2 ring-violet-300/40" : ""}`}
            aria-labelledby={`quadrant-${quadrant.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold">{quadrant.number}</span>
                <div><h4 id={`quadrant-${quadrant.id}`} className="font-semibold">{quadrant.title}</h4><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{quadrant.axis}</p></div>
              </div>
              <span className="text-sm text-slate-400">{items.length}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{quadrant.guidance}</p>
            {selectedItem && selectedItem.quadrant !== quadrant.id && <button type="button" disabled={Boolean(busyKey)} onClick={() => void move(selectedItem, quadrant.id)} className="mt-3 min-h-11 w-full rounded-lg border border-violet-400/70 bg-violet-950/40 px-3 text-sm font-semibold text-violet-200 hover:bg-violet-900/60 disabled:opacity-50">Place selected here</button>}
            <div className="mt-3 grid gap-2">
              {items.map((item) => <TaskCard key={decisionItemKey(item.sourceKind, item.sourceId)} item={item} inMatrix />)}
              {!items.length && <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-700/80 px-4 text-center text-xs leading-5 text-slate-500">Drop work here</div>}
            </div>
          </section>;
        })}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="task-pool-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Unsorted work</p><h3 id="task-pool-heading" className="mt-1 text-xl font-semibold">Task pool</h3><p className="mt-1 text-sm text-slate-400">Open project tasks, milestones, and Pillars next actions that have not been placed today.</p></div>
        <span className="text-sm font-semibold text-slate-300">{pool.length} of {unplacedItems.length} showing</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)_12rem]">
        <label className="text-sm font-medium text-slate-300">Search tasks<input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/30" placeholder="Task, project, client…" /></label>
        <label className="text-sm font-medium text-slate-300">Project<select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"><option value="ALL">All projects</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}{project.clientName ? ` · ${project.clientName}` : ""} ({project.count})</option>)}</select></label>
        <label className="text-sm font-medium text-slate-300">Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"><option value="ALL">All open work</option><option value="PROJECT_TASK">Project tasks</option><option value="MILESTONE">Milestones</option><option value="NEXT_ACTION">Next actions</option></select></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={moreFiltersOpen} onClick={() => setMoreFiltersOpen((open) => !open)} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800">{moreFiltersOpen ? "Hide" : "More"} filters{activeFilterCount ? ` · ${activeFilterCount} active` : ""}</button>
        {(activeFilterCount > 0 || search || sortMode !== "DUE_SOON") && <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-violet-300 hover:bg-violet-950/40">Clear filters</button>}
      </div>
      {moreFiltersOpen && <div className="mt-3 grid gap-3 rounded-xl border border-slate-700 bg-slate-950/45 p-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-300">Client<select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"><option value="ALL">All clients</option>{clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name} ({client.count})</option>)}</select></label>
        <label className="text-sm font-medium text-slate-300">Due date<select value={dueFilter} onChange={(event) => setDueFilter(event.target.value as DueFilter)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"><option value="ALL">Any due date</option><option value="OVERDUE">Overdue</option><option value="TODAY">Due today</option><option value="NEXT_7_DAYS">Due in 7 days</option><option value="NO_DUE_DATE">No due date</option></select></label>
        <label className="text-sm font-medium text-slate-300">Sort by<select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-100"><option value="DUE_SOON">Due soon</option><option value="PROJECT">Project</option><option value="CLIENT">Client</option><option value="TITLE">A–Z</option><option value="NEWEST">Newest added</option></select></label>
      </div>}
      <div className="mt-4 grid max-h-[42rem] gap-3 overflow-y-auto overscroll-contain pr-1 lg:grid-cols-2">
        {pool.map((item) => <TaskCard key={decisionItemKey(item.sourceKind, item.sourceId)} item={item} />)}
        {!pool.length && <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400 lg:col-span-2">Everything matching this view is already placed—or there is no open work yet.</p>}
      </div>
    </section>

    {draggingItem && dragPoint && <div aria-hidden="true" className="pointer-events-none fixed z-[100] max-w-xs rounded-xl border border-violet-300 bg-slate-950/95 px-3 py-2 text-sm font-semibold text-slate-100 shadow-2xl" style={{ left: dragPoint.x + 14, top: dragPoint.y + 14 }}>{draggingItem.title}</div>}
  </div>;
}
