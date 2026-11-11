"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Goal = {
  id: string;
  title: string;
  purpose: string;
  horizon: string;
  parentId: string | null;
  done: boolean;
  targetDate: string | null;
  startAt: string | null;
  endAt: string | null;
  domainKey: string;
};

type DomainState = {
  domainKey: string;
  desiredState: string;
  gap: string;
  activeSystem: string;
};

type CoreData = { goals: Goal[]; domains: DomainState[] };
type Position = { x: number; y: number; depth: number };

const horizons = ["LIFETIME", "PHASE", "YEAR", "SPRINT", "MONTH", "WEEK", "DAY", "HOUR"] as const;
const horizonLabel: Record<string, string> = {
  LIFETIME: "Life", PHASE: "Phase", YEAR: "Year", SPRINT: "13-week sprint", MONTH: "Month", WEEK: "Week", DAY: "Day", HOUR: "Hour",
};
const input = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/40";
const button = "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:opacity-50";

function displayDate(value: string | null) {
  if (!value) return "No target date";
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00.000Z`));
}

function layout(goals: Goal[]) {
  const byId = new Map(goals.map((goal) => [goal.id, goal]));
  const children = new Map<string | null, Goal[]>();
  goals.forEach((goal) => {
    const parent = goal.parentId && byId.has(goal.parentId) ? goal.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), goal]);
  });
  children.forEach((items) => items.sort((a, b) => (a.targetDate || "9999").localeCompare(b.targetDate || "9999") || a.title.localeCompare(b.title)));

  const positions = new Map<string, Position>();
  let leaf = 0;
  function place(goal: Goal, depth: number): number {
    const descendants = children.get(goal.id) ?? [];
    const y = descendants.length
      ? descendants.map((child) => place(child, depth + 1)).reduce((sum, value) => sum + value, 0) / descendants.length
      : 64 + leaf++ * 166;
    positions.set(goal.id, { x: 350 + depth * 310, y, depth });
    return y;
  }
  (children.get(null) ?? []).forEach((goal) => place(goal, 0));
  const maxDepth = Math.max(0, ...positions.values().map((position) => position.depth));
  const height = Math.max(520, leaf * 166 + 30);
  return { positions, width: Math.max(980, 690 + maxDepth * 310), height, rootY: height / 2 };
}

export default function OmnisMindMap() {
  const [data, setData] = useState<CoreData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading mission map…");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [horizon, setHorizon] = useState("YEAR");
  const [targetDate, setTargetDate] = useState("");
  const [parentId, setParentId] = useState("");

  async function refresh() {
    const response = await fetch("/api/lifeos/core", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load the private mission map");
    const next = await response.json() as CoreData;
    setData(next);
    setStatus("Mission map loaded");
  }

  useEffect(() => { refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load")); }, []);

  const goals = useMemo(() => data?.goals.filter((goal) => goal.domainKey === "OMNIS") ?? [], [data]);
  const mission = data?.domains.find((item) => item.domainKey === "OMNIS");
  const map = useMemo(() => layout(goals), [goals]);
  const selected = goals.find((goal) => goal.id === selectedId) ?? null;

  function clearForm() {
    setTitle(""); setPurpose(""); setHorizon("YEAR"); setTargetDate(""); setParentId("");
  }

  function beginAdd(parent = "") {
    clearForm(); setParentId(parent); setSelectedId(null); setAdding(true); setError("");
  }

  function beginEdit(goal: Goal) {
    setTitle(goal.title); setPurpose(goal.purpose || ""); setHorizon(goal.horizon); setTargetDate(goal.targetDate?.slice(0, 10) || ""); setParentId(goal.parentId || "");
    setSelectedId(goal.id); setAdding(false); setError("");
  }

  async function send(url: string, method: "POST" | "PATCH", body: object) {
    setBusy(true); setError(""); setStatus("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error || "Unable to save"); }
      await refresh(); setStatus("Mission map saved"); return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save"); return false; }
    finally { setBusy(false); }
  }

  async function addPin(event: FormEvent) {
    event.preventDefault();
    const saved = await send("/api/lifeos", "POST", { kind: "goal", title, purpose, horizon, targetDate: targetDate || null, parentId: parentId || null, domainKey: "OMNIS" });
    if (saved) { setAdding(false); clearForm(); }
  }

  async function updatePin(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const saved = await send("/api/lifeos/core", "PATCH", { kind: "goal-update", id: selected.id, domainKey: "OMNIS", title, purpose, horizon, targetDate: targetDate || null, parentId: parentId || null, done: selected.done });
    if (saved) setSelectedId(null);
  }

  async function togglePin(goal: Goal) {
    await send("/api/lifeos/core", "PATCH", { kind: "goal-update", id: goal.id, domainKey: "OMNIS", title: goal.title, purpose: goal.purpose, horizon: goal.horizon, targetDate: goal.targetDate?.slice(0, 10) || null, parentId: goal.parentId, done: !goal.done });
  }

  if (!data && !error) return <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400" role="status">Loading Operation OMNIS…</div>;

  const rootTitle = mission?.desiredState || "Operation OMNIS";
  const rootSubtitle = mission?.activeSystem || mission?.gap || "Define the mission, then connect the outcomes that make it real.";

  return <div className="mt-5 space-y-5">
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-700 bg-red-950/30 p-3 text-red-200">{error}</p>}

    <section className="rounded-2xl border border-violet-800 bg-slate-900 p-4 sm:p-5" aria-labelledby="omnis-map-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Mission architecture</p>
          <h3 id="omnis-map-heading" className="mt-1 text-xl font-semibold">OMNIS mind map</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Each pinpoint is an OMNIS objective. Connections show what supports what; the horizon and target date place the same objective on your Timeline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => beginAdd()} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>+ Add pinpoint</button>
          <Link href="/lifeos/timeline" className={`${button} inline-flex items-center border border-slate-600 hover:bg-slate-800`}>Open Timeline</Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400" aria-label="Map legend">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-violet-400" />Active</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />Overdue</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />Complete</span>
        <span>Tap a node to inspect or edit it</span>
      </div>

      <div className="mt-4 overflow-x-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-950/70" tabIndex={0} aria-label="Scrollable Operation OMNIS mind map">
        <div className="relative" style={{ width: `${map.width}px`, height: `${map.height}px` }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {goals.map((goal) => {
              const child = map.positions.get(goal.id);
              if (!child) return null;
              const parent = goal.parentId ? map.positions.get(goal.parentId) : null;
              const x1 = parent ? parent.x + 260 : 284;
              const y1 = parent ? parent.y + 58 : map.rootY;
              const x2 = child.x;
              const y2 = child.y + 58;
              const middle = x1 + (x2 - x1) / 2;
              return <path key={goal.id} d={`M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`} fill="none" stroke={goal.done ? "#34d399" : "#8b5cf6"} strokeWidth="2" strokeOpacity="0.65" />;
            })}
          </svg>

          <button type="button" onClick={() => beginAdd()} className="absolute left-6 w-[260px] rounded-2xl border border-violet-500 bg-violet-950/70 p-4 text-left shadow-xl shadow-violet-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300" style={{ top: `${map.rootY - 72}px` }}>
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-violet-300">North star</span>
            <span className="mt-2 block max-h-12 overflow-hidden font-semibold leading-6 text-white">{rootTitle}</span>
            <span className="mt-2 block max-h-10 overflow-hidden text-xs leading-5 text-violet-100/70">{rootSubtitle}</span>
          </button>

          {goals.map((goal) => {
            const position = map.positions.get(goal.id);
            if (!position) return null;
            const due = goal.targetDate?.slice(0, 10) || "";
            const overdue = Boolean(due && !goal.done && due < new Date().toISOString().slice(0, 10));
            return <button key={goal.id} type="button" onClick={() => beginEdit(goal)} className={`absolute w-[260px] rounded-xl border p-4 text-left shadow-lg transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${goal.done ? "border-emerald-700 bg-emerald-950/35" : overdue ? "border-rose-700 bg-rose-950/35" : "border-slate-600 bg-slate-900"}`} style={{ left: `${position.x}px`, top: `${position.y}px` }}>
              <span className={`block text-[11px] font-bold uppercase tracking-wide ${goal.done ? "text-emerald-300" : overdue ? "text-rose-300" : "text-violet-300"}`}>{horizonLabel[goal.horizon] || goal.horizon}{goal.done ? " · Complete" : overdue ? " · Overdue" : ""}</span>
              <span className={`mt-1 block max-h-12 overflow-hidden font-semibold leading-6 ${goal.done ? "text-slate-400 line-through" : "text-slate-100"}`}>{goal.title}</span>
              <span className="mt-2 block truncate text-xs text-slate-400">{displayDate(goal.targetDate)}</span>
              {goal.purpose && <span className="mt-2 block max-h-10 overflow-hidden text-xs leading-5 text-slate-500">Why: {goal.purpose}</span>}
            </button>;
          })}

          {!goals.length && <div className="absolute left-[350px] top-1/2 w-[280px] -translate-y-1/2 rounded-xl border border-dashed border-slate-600 p-5 text-sm text-slate-400"><p className="font-semibold text-slate-200">Start the mission map</p><p className="mt-2 leading-6">Add the first thing that must be built. Then branch supporting outcomes beneath it.</p><button type="button" onClick={() => beginAdd()} className={`${button} mt-3 border border-violet-700 text-violet-200`}>Add first pinpoint</button></div>}
        </div>
      </div>
    </section>

    {(adding || selected) && <section className="rounded-2xl border border-violet-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="pinpoint-editor-heading">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{adding ? "New connection" : "Selected pinpoint"}</p><h3 id="pinpoint-editor-heading" className="mt-1 text-lg font-semibold">{adding ? "Add to the mission map" : "Edit the pinpoint"}</h3></div><button type="button" onClick={() => { setAdding(false); setSelectedId(null); clearForm(); }} className={`${button} border border-slate-700 text-sm`}>Close</button></div>
      <form onSubmit={adding ? addPin : updatePin} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="font-medium md:col-span-2">What needs to be built?<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className={input} placeholder="A concrete outcome or capability…" /></label>
        <label className="font-medium md:col-span-2">Why does it need to exist?<textarea rows={3} maxLength={1500} value={purpose} onChange={(event) => setPurpose(event.target.value)} className={input} placeholder="The problem it solves, value it creates, or reason it matters…" /></label>
        <label className="font-medium">Time scale<select value={horizon} onChange={(event) => setHorizon(event.target.value)} className={input}>{horizons.map((item) => <option key={item} value={item}>{horizonLabel[item]}</option>)}</select></label>
        <label className="font-medium">Target date <span className="text-xs font-normal text-slate-400">(optional)</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className={input} /></label>
        <label className="font-medium md:col-span-2">Connects to<select value={parentId} onChange={(event) => setParentId(event.target.value)} className={input}><option value="">Operation OMNIS — north star</option>{goals.filter((goal) => goal.id !== selected?.id).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-400">Choose the outcome this pinpoint supports. The line on the map and parent relationship on Timeline update together.</span></label>
        <div className="flex flex-wrap gap-2 md:col-span-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>{adding ? "Add pinpoint" : "Save changes"}</button>{selected && <button type="button" disabled={busy} onClick={() => togglePin(selected)} className={`${button} border border-slate-600`}>{selected.done ? "Reopen" : "Mark complete"}</button>}{selected && <button type="button" onClick={() => beginAdd(selected.id)} className={`${button} border border-slate-600`}>Add connected pinpoint</button>}</div>
      </form>
    </section>}
  </div>;
}
