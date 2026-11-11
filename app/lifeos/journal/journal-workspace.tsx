"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";

type InkPoint = { x: number; y: number; p: number };
type InkStroke = { points: InkPoint[] };
type Entry = {
  id: string;
  kind: "JOURNAL" | "NOTE";
  title: string;
  body: string;
  tags: string[];
  inkData: string;
  occurredOn: string;
  createdAt: string;
  updatedAt: string;
};

const input = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/40";
const button = "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:opacity-50";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

function parseInk(value: string) {
  if (!value) return [];
  try {
    const strokes = JSON.parse(value);
    return Array.isArray(strokes) ? strokes as InkStroke[] : [];
  } catch { return []; }
}

function InkCanvas({ strokes, onChange }: { strokes: InkStroke[]; onChange: (strokes: InkStroke[]) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const active = useRef<InkStroke | null>(null);

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * scale) || canvas.height !== Math.round(rect.height * scale)) {
      canvas.width = Math.round(rect.width * scale); canvas.height = Math.round(rect.height * scale);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#e2e8f0";
    for (const stroke of strokes) {
      if (!stroke.points.length) continue;
      context.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * rect.width; const y = point.y * rect.height;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      const pressure = stroke.points.reduce((sum, point) => sum + point.p, 0) / stroke.points.length;
      context.lineWidth = 1.5 + pressure * 3.5; context.stroke();
    }
  }

  useEffect(() => {
    redraw();
    const observer = new ResizeObserver(redraw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [strokes]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>): InkPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)), p: event.pressure || 0.5 };
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true; active.current = { points: [point(event)] };
    onChange([...strokes, active.current]);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !active.current) return;
    event.preventDefault();
    active.current = { points: [...active.current.points, point(event)] };
    onChange([...strokes.slice(0, -1), active.current]);
  }

  function stop(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    event.preventDefault(); drawing.current = false; active.current = null;
  }

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="font-semibold">Freehand ink</p><p className="mt-1 text-xs leading-5 text-slate-400">Apple Pencil pressure is preserved. Finger touches are ignored to prevent accidental marks.</p></div>
      <div className="flex gap-2"><button type="button" disabled={!strokes.length} onClick={() => onChange(strokes.slice(0, -1))} className={`${button} border border-slate-700 text-sm`}>Undo</button><button type="button" disabled={!strokes.length} onClick={() => onChange([])} className={`${button} border border-slate-700 text-sm`}>Clear ink</button></div>
    </div>
    <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="mt-3 h-[22rem] w-full rounded-xl border border-slate-600 bg-slate-950 shadow-inner touch-none" aria-label="Apple Pencil freehand writing canvas" />
  </div>;
}

export default function JournalWorkspace() {
  const editorRef = useRef<HTMLElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "JOURNAL" | "NOTE">("ALL");
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<"JOURNAL" | "NOTE">("JOURNAL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading private writing…");

  const selected = useMemo(() => entries.find((entry) => entry.id === selectedId) ?? null, [entries, selectedId]);

  async function refresh(query = search, entryFilter = filter) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (entryFilter !== "ALL") params.set("kind", entryFilter);
    const response = await fetch(`/api/lifeos/journal?${params}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load your private writing");
    const data = await response.json() as { entries: Entry[] };
    setEntries(data.entries); setStatus(`${data.entries.length} ${data.entries.length === 1 ? "entry" : "entries"} found`);
  }

  useEffect(() => { refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load")); }, []);

  function beginNew(nextKind: "JOURNAL" | "NOTE") {
    setSelectedId(null); setKind(nextKind); setTitle(""); setBody(""); setTags(""); setOccurredOn(today()); setStrokes([]); setEditing(true); setError("");
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function beginEdit(entry: Entry) {
    setSelectedId(entry.id); setKind(entry.kind); setTitle(entry.title); setBody(entry.body); setTags(entry.tags.join(", ")); setOccurredOn(entry.occurredOn.slice(0, 10)); setStrokes(parseInk(entry.inkData)); setEditing(true); setError("");
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const payload = { id: selectedId, kind, title, body, occurredOn, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), inkData: strokes.length ? JSON.stringify(strokes) : "" };
    try {
      const response = await fetch("/api/lifeos/journal", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error || "Unable to save"); }
      await refresh(); setEditing(false); setStatus(`${kind === "JOURNAL" ? "Journal entry" : "Note"} saved`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save"); }
    finally { setBusy(false); }
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to search"); }
  }

  async function changeFilter(value: "ALL" | "JOURNAL" | "NOTE") {
    setFilter(value); setError("");
    try { await refresh(search, value); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to filter"); }
  }

  return <div className="mt-5 space-y-5">
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-700 bg-red-950/30 p-3 text-red-200">{error}</p>}

    <section className="rounded-2xl border border-violet-800 bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={runSearch} className="flex-1"><label className="font-medium">Search your writing<span className="mt-1 block text-xs font-normal leading-5 text-slate-400">Searches titles, typed or Scribble-converted text, and exact tags. Freehand canvas marks remain visual.</span><span className="mt-2 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${input} mt-0`} placeholder="A word, phrase, or tag…" /><button className={`${button} bg-violet-400 text-slate-950`}>Search</button></span></label></form>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => beginNew("JOURNAL")} className={`${button} bg-violet-400 text-slate-950`}>+ Journal entry</button><button type="button" onClick={() => beginNew("NOTE")} className={`${button} border border-slate-600`}>+ Note</button></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Writing type filters">{(["ALL", "JOURNAL", "NOTE"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => changeFilter(item)} className={`${button} border text-sm ${filter === item ? "border-violet-500 bg-violet-950/60 text-violet-200" : "border-slate-700 text-slate-400"}`}>{item === "ALL" ? "All writing" : item === "JOURNAL" ? "Journal" : "Notes"}</button>)}</div>
    </section>

    <div className="grid min-w-0 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="order-2 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 xl:order-1" aria-label="Journal and note database">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Writing database</h3><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{entries.length}</span></div>
        <div className="mt-3 max-h-[68vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {entries.map((entry) => <button key={entry.id} type="button" onClick={() => beginEdit(entry)} className={`block min-h-11 w-full rounded-xl border p-3 text-left ${selectedId === entry.id ? "border-violet-500 bg-violet-950/40" : "border-slate-800 hover:bg-slate-800"}`}><span className="flex items-start justify-between gap-2"><span className="min-w-0 truncate font-semibold">{entry.title}</span><span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-violet-300">{entry.kind === "JOURNAL" ? "Journal" : "Note"}</span></span><span className="mt-1 block text-xs text-slate-500">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${entry.occurredOn.slice(0, 10)}T12:00:00.000Z`))}{entry.inkData ? " · Ink" : ""}</span><span className="mt-2 block max-h-10 overflow-hidden text-xs leading-5 text-slate-400">{entry.body || "Freehand entry"}</span></button>)}
          {!entries.length && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm leading-6 text-slate-400">No entries match this view. Start a journal entry or note.</p>}
        </div>
      </aside>

      <section ref={editorRef} className="order-1 min-w-0 scroll-mt-24 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5 xl:order-2">
        {!editing ? <div className="flex min-h-[28rem] items-center justify-center"><div className="max-w-lg text-center"><p className="text-4xl" aria-hidden="true">✎</p><h3 className="mt-3 text-xl font-semibold">A private space to think</h3><p className="mt-2 text-sm leading-6 text-slate-400">Use Apple Pencil Scribble in the text area for searchable handwriting, or open the freehand canvas for diagrams and handwritten pages.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => beginNew("JOURNAL")} className={`${button} bg-violet-400 text-slate-950`}>Write journal entry</button><button type="button" onClick={() => beginNew("NOTE")} className={`${button} border border-slate-600`}>Take a note</button></div></div></div> : <form onSubmit={save} className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{selected ? "Editing" : "New"} {kind === "JOURNAL" ? "journal entry" : "note"}</p><h3 className="mt-1 text-xl font-semibold">{selected ? selected.title : "Blank page"}</h3></div><button type="button" onClick={() => setEditing(false)} className={`${button} border border-slate-700`}>Close</button></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="font-medium">Type<select value={kind} onChange={(event) => setKind(event.target.value as "JOURNAL" | "NOTE")} className={input}><option value="JOURNAL">Journal entry</option><option value="NOTE">Note</option></select></label><label className="font-medium">Entry date<input required type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className={input} /></label></div>
          <label className="block font-medium">Title<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className={input} placeholder={kind === "JOURNAL" ? "What is this entry about?" : "Name this note"} /></label>
          <label className="block font-medium">Writing area<span className="mt-1 block text-xs font-normal leading-5 text-slate-400">Tap here with Apple Pencil and use iPad Scribble to convert handwriting into text that can be searched later.</span><textarea rows={12} maxLength={50_000} value={body} onChange={(event) => setBody(event.target.value)} className={`${input} min-h-[18rem] leading-7`} placeholder="Write freely…" /></label>
          <label className="block font-medium">Tags <span className="text-xs font-normal text-slate-400">(comma-separated)</span><input value={tags} onChange={(event) => setTags(event.target.value)} className={input} placeholder="idea, family, operation-omnis…" /></label>
          <details className="rounded-xl border border-slate-700 p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-violet-300">Open Apple Pencil canvas{strokes.length ? ` · ${strokes.length} stroke${strokes.length === 1 ? "" : "s"}` : ""}</summary><div className="mt-3"><InkCanvas strokes={strokes} onChange={setStrokes} /></div></details>
          <div className="flex flex-wrap gap-2"><button disabled={busy} className={`${button} bg-violet-400 text-slate-950`}>{selected ? "Save changes" : "Save entry"}</button><button type="button" onClick={() => setEditing(false)} className={`${button} border border-slate-700`}>Cancel</button></div>
        </form>}
      </section>
    </div>
  </div>;
}
