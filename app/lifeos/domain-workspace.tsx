"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DOMAIN_LABELS, type LifeOSDomainKey } from "@/lib/lifeos-domains";

type DomainState = { id: string; domainKey: string; currentState: string; desiredState: string; gap: string; activeSystem: string; nextActions: string; evidence: string };
type Goal = { id: string; title: string; domainKey: string; horizon: string; done: boolean; targetValue: number | null; targetUnit: string };
type Routine = { id: string; domainKey: string; title: string; cadence: string; active: boolean };
type Action = { id: string; domainKey: string; title: string; status: string };
type Metric = { id: string; domainKey: string; name: string; unit: string; sensitivity: string };
type Measurement = { id: string; metricId: string; value: number; note: string; observedAt: string };
type Principle = { id: string; domainKey: string; title: string; statement: string };
type Commitment = { id: string; area: string; title: string; cadence: string; note: string };
type CoreData = { domains: DomainState[]; goals: Goal[]; routines: Routine[]; actions: Action[]; metrics: Metric[]; measurements: Measurement[]; healthMeasurements: Measurement[]; principles: Principle[]; commitments: Commitment[] };

const emptyState = { currentState: "", desiredState: "", gap: "", activeSystem: "", nextActions: "", evidence: "" };
const input = "lifeos-editable mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/40";
const button = "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-50";

export default function DomainWorkspace({ domainKey, intro, areas = [] }: { domainKey: LifeOSDomainKey; intro?: string; areas?: string[] }) {
  const relationshipAreas = areas.length ? areas : ["Family", "Friends", "Community"];
  const [data, setData] = useState<CoreData | null>(null);
  const [state, setState] = useState(emptyState);
  const [status, setStatus] = useState("Loading workspace…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineCadence, setRoutineCadence] = useState("WEEKLY");
  const [actionTitle, setActionTitle] = useState("");
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
  async function addOutcome(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos", "POST", { kind: "goal", title: outcomeTitle, horizon: "YEAR", domainKey })) setOutcomeTitle(""); }
  async function addRoutine(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "routine", domainKey, title: routineTitle, cadence: routineCadence })) setRoutineTitle(""); }
  async function addAction(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "action", domainKey, title: actionTitle })) setActionTitle(""); }
  async function addMetric(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "metric", domainKey, name: metricName, unit: metricUnit, direction: "NEUTRAL" })) { setMetricName(""); setMetricUnit(""); } }
  async function addMeasurement(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "measurement", metricId, value: measurementValue, note: measurementNote, observedAt: new Date().toISOString() })) { setMeasurementValue(""); setMeasurementNote(""); } }
  async function addPrinciple(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "principle", domainKey, title: principleTitle, statement: principleStatement })) { setPrincipleTitle(""); setPrincipleStatement(""); } }
  async function addCommitment(event: FormEvent) { event.preventDefault(); if (await send("/api/lifeos/core", "POST", { kind: "commitment", title: commitmentTitle, area: commitmentArea, cadence: commitmentCadence })) { setCommitmentTitle(""); setCommitmentCadence(""); } }

  if (!data && !error) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400" role="status">Loading {DOMAIN_LABELS[domainKey]}…</div>;

  return <div className="mt-5 space-y-5">
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-600 p-3 text-red-300">{error}</p>}
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Operating state</h3><p className="mt-1 text-sm text-slate-400">{intro || `Close the loop for ${DOMAIN_LABELS[domainKey]} with explicit state, systems, actions, and evidence.`}</p>
      <form onSubmit={saveState} className="mt-4 grid gap-4 md:grid-cols-2">
        {([ ["Current State", "currentState"], ["Desired State", "desiredState"], ["Gap", "gap"], ["Active System", "activeSystem"], ["Next Actions", "nextActions"], ["Evidence", "evidence"] ] as const).map(([label, key]) => <label key={key} className="font-medium">{label}<textarea rows={3} maxLength={6000} value={state[key]} onChange={(event) => setState((current) => ({ ...current, [key]: event.target.value }))} className={input} placeholder={`Define ${label.toLowerCase()}…`} /></label>)}
        <div className="md:col-span-2"><button disabled={busy} className={`${button} bg-teal-400 text-slate-950 hover:bg-teal-300`}>Save operating state</button></div>
      </form>
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Desired outcomes</h3><p className="mt-1 text-sm text-slate-400">Outcomes use the existing LifeOS goal system and remain visible on Timeline.</p>
        <div className="mt-3 space-y-2">{scoped.goals.length ? scoped.goals.map((goal) => <div key={goal.id} className="rounded-lg border border-slate-800 p-3"><p className={goal.done ? "text-slate-500 line-through" : "font-medium"}>{goal.title}</p><p className="mt-1 text-xs text-slate-500">{goal.horizon}{goal.targetValue !== null ? ` · ${goal.targetValue} ${goal.targetUnit}` : ""}</p></div>) : <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No outcomes yet. Add the first outcome when the desired state is clear.</p>}</div>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-teal-300">Add outcome</summary><form onSubmit={addOutcome} className="mt-2 flex flex-col gap-3 sm:flex-row"><label className="flex-1 font-medium">Outcome<input required maxLength={180} value={outcomeTitle} onChange={(e) => setOutcomeTitle(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} self-end bg-teal-400 text-slate-950`}>Add</button></form></details>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <h3 className="text-lg font-semibold">Active system</h3><p className="mt-1 text-sm text-slate-400">Routines create repeatable conditions; actions move the current gap.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><h4 className="text-sm font-semibold text-slate-300">Routines</h4>{scoped.routines.map((item) => <p key={item.id} className="mt-2 rounded-lg border border-slate-800 p-3 text-sm">{item.title}<span className="block text-xs text-slate-500">{item.cadence.toLowerCase()}</span></p>)}</div><div><h4 className="text-sm font-semibold text-slate-300">Next actions</h4>{scoped.actions.map((item) => <div key={item.id} className="mt-2 flex items-center gap-2 rounded-lg border border-slate-800 p-2"><span className={`min-w-0 flex-1 text-sm ${item.status === "DONE" ? "text-slate-500 line-through" : ""}`}>{item.title}</span>{item.status === "OPEN" && <button onClick={() => send("/api/lifeos/core", "PATCH", { kind: "action-status", id: item.id, status: "DONE", domainKey })} className="min-h-11 rounded-md border border-slate-700 px-2 text-xs">Done</button>}</div>)}</div></div>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-teal-300">Add routine or action</summary><div className="mt-2 grid gap-3 sm:grid-cols-2"><form onSubmit={addRoutine}><label className="font-medium">Routine<input required value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} className={input} /></label><label className="mt-2 block text-sm">Cadence<select value={routineCadence} onChange={(e) => setRoutineCadence(e.target.value)} className={input}><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select></label><button disabled={busy} className={`${button} mt-3 border border-slate-600`}>Add routine</button></form><form onSubmit={addAction}><label className="font-medium">Next action<input required value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} mt-3 border border-slate-600`}>Add action</button></form></div></details>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Evidence & metrics</h3><p className="mt-1 text-sm text-slate-400">Manual evidence is real data you enter. {domainKey === "HEALTH" ? "Health values are stored in a separate encrypted record boundary." : "No external provider data is inferred."}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{scoped.metrics.map((metric) => { const latest = measurements.find((item) => item.metricId === metric.id); return <article key={metric.id} className="rounded-xl border border-slate-800 p-3"><p className="font-medium">{metric.name}</p><p className="mt-1 text-sm text-slate-400">{latest ? `${latest.value} ${metric.unit}` : "No measurements"}</p>{latest?.note && <p className="mt-1 text-xs text-slate-500">{latest.note}</p>}</article>; })}{!scoped.metrics.length && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No metrics defined. Start with one measure that changes a decision.</p>}</div>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-teal-300">Define metric or record evidence</summary><div className="mt-2 grid gap-4 md:grid-cols-2"><form onSubmit={addMetric}><label className="font-medium">Metric name<input required value={metricName} onChange={(e) => setMetricName(e.target.value)} className={input} /></label><label className="mt-2 block font-medium">Unit<input value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} mt-3 border border-slate-600`}>Define metric</button></form><form onSubmit={addMeasurement}><label className="font-medium">Metric<select required value={metricId} onChange={(e) => setMetricId(e.target.value)} className={input}><option value="">Choose metric</option>{scoped.metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}</select></label><label className="mt-2 block font-medium">Value<input required type="number" step="any" value={measurementValue} onChange={(e) => setMeasurementValue(e.target.value)} className={input} /></label><label className="mt-2 block font-medium">Evidence note<input value={measurementNote} onChange={(e) => setMeasurementNote(e.target.value)} className={input} /></label><button disabled={busy || !metricId} className={`${button} mt-3 bg-teal-400 text-slate-950`}>Record evidence</button></form></div></details>
    </section>

    {(domainKey === "SELF" || domainKey === "OMNIS") && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Principles</h3><div className="mt-3 space-y-2">{scoped.principles.map((item) => <article key={item.id} className="rounded-lg border border-slate-800 p-3"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-slate-400">{item.statement}</p></article>)}</div><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-teal-300">Add principle</summary><form onSubmit={addPrinciple} className="mt-2 grid gap-3"><label>Title<input required value={principleTitle} onChange={(e) => setPrincipleTitle(e.target.value)} className={input} /></label><label>Statement<textarea rows={2} value={principleStatement} onChange={(e) => setPrincipleStatement(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} w-fit border border-slate-600`}>Add principle</button></form></details></section>}

    {domainKey === "RELATIONSHIPS" && <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Commitments & rhythms</h3><p className="mt-1 text-sm text-slate-400">Track your commitments—not scores for other people. Notes remain private.</p><div className="mt-3 space-y-2">{data?.commitments.map((item) => <article key={item.id} className="rounded-lg border border-slate-800 p-3"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.area}{item.cadence ? ` · ${item.cadence}` : ""}</p></article>)}</div><details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-teal-300">Add commitment</summary><form onSubmit={addCommitment} className="mt-2 grid gap-3 sm:grid-cols-2"><label>Commitment<input required value={commitmentTitle} onChange={(e) => setCommitmentTitle(e.target.value)} className={input} /></label><label>Area<select value={commitmentArea} onChange={(e) => setCommitmentArea(e.target.value)} className={input}>{relationshipAreas.map((area) => <option key={area}>{area}</option>)}</select></label><label>Rhythm<input placeholder="Weekly, monthly…" value={commitmentCadence} onChange={(e) => setCommitmentCadence(e.target.value)} className={input} /></label><div className="self-end"><button disabled={busy} className={`${button} bg-teal-400 text-slate-950`}>Add commitment</button></div></form></details></section>}
  </div>;
}
