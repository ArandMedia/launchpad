"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { HEALTH_CHECK_IN_METRICS, type HealthMetricKey } from "@/lib/lifeos-health";

type Values = Partial<Record<HealthMetricKey, number | string>>;
type Entry = { date: string; values: Partial<Record<HealthMetricKey, number>>; note: string };

const input = "lifeos-editable mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-teal-300 focus:outline-none";
const primaryKeys: HealthMetricKey[] = ["sleep_duration_hours", "sleep_score", "sleep_efficiency_pct", "rem_minutes", "deep_minutes", "core_minutes", "awake_minutes", "resting_heart_rate", "hrv_ms"];
const trendKeys: HealthMetricKey[] = ["sleep_duration_hours", "rem_minutes", "deep_minutes", "sleep_efficiency_pct", "resting_heart_rate", "hrv_ms"];

function todayInChicago() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return <div className="mt-3 h-12 rounded-lg border border-dashed border-slate-800" aria-hidden="true" />;
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const points = values.map((value, index) => `${values.length === 1 ? 90 : index * (180 / (values.length - 1))},${44 - ((value - min) / span) * 38}`).join(" ");
  return <svg viewBox="0 0 180 50" className="mt-2 h-12 w-full" role="img" aria-label={`Trend from ${values[0]} to ${values.at(-1)}`}><polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} className="text-teal-300" /></svg>;
}

function MetricInput({ metricKey, values, setValues }: { metricKey: HealthMetricKey; values: Values; setValues: (next: Values) => void }) {
  const metric = HEALTH_CHECK_IN_METRICS.find((item) => item.key === metricKey)!;
  return <label className="block text-sm font-medium">{metric.name}<span className="ml-1 text-xs font-normal text-slate-500">({metric.unit})</span><input type="number" inputMode="decimal" min={metric.min} max={metric.max} step={metric.step} value={values[metricKey] ?? ""} onChange={(event) => setValues({ ...values, [metricKey]: event.target.value })} className={input} /></label>;
}

export default function HealthCheckIn() {
  const [date, setDate] = useState(todayInChicago);
  const [values, setValues] = useState<Values>({});
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState("Loading health history…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch("/api/lifeos/health?days=365", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load encrypted health history");
    const data = await response.json() as { entries: Entry[] };
    setEntries(data.entries);
    setStatus("Health history loaded");
    return data.entries;
  }

  useEffect(() => { refresh().then((source) => loadDate(date, source)).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load health history")); }, []);

  function loadDate(nextDate: string, source = entries) {
    setDate(nextDate);
    const existing = source.find((entry) => entry.date === nextDate);
    setValues(existing?.values || {});
    setNote(existing?.note || "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setStatus("");
    const response = await fetch("/api/lifeos/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, values, note }) });
    if (!response.ok) { const result = await response.json().catch(() => null); setError(result?.error || "Unable to save health check-in"); setBusy(false); return; }
    const next = await refresh(); loadDate(date, next); setStatus("Encrypted health check-in saved"); setBusy(false);
  }

  const latest = entries[0];
  const advanced = HEALTH_CHECK_IN_METRICS.filter((metric) => !primaryKeys.includes(metric.key));
  const groupedAdvanced = useMemo(() => Object.groupBy(advanced, (metric) => metric.group), [advanced]);

  return <section className="mt-5 rounded-2xl border border-teal-900 bg-slate-900 p-4 sm:p-5" aria-labelledby="health-check-in-heading">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Encrypted daily evidence</p><h3 id="health-check-in-heading" className="mt-1 text-xl font-semibold">Health & sleep check-in</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">Enter only the readings you have. Every value and note is encrypted separately and can be replaced for the same date. This is personal tracking, not medical advice.</p></div><span className="rounded-full border border-teal-800 px-3 py-1 text-xs text-teal-200">Manual · private</span></div>
    <p className="sr-only" role="status" aria-live="polite">{status}</p>{error && <p role="alert" className="mt-4 rounded-lg border border-red-700 p-3 text-red-300">{error}</p>}
    <form onSubmit={submit} className="mt-5"><label className="block max-w-xs text-sm font-medium">Check-in date<input required type="date" value={date} onChange={(event) => loadDate(event.target.value)} className={input} /></label>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{primaryKeys.map((key) => <MetricInput key={key} metricKey={key} values={values} setValues={setValues} />)}</div>
      <details className="mt-4 rounded-xl border border-slate-800"><summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold text-teal-300">More sleep, recovery & daily metrics</summary><div className="grid gap-4 border-t border-slate-800 p-4 md:grid-cols-2 xl:grid-cols-3">{Object.entries(groupedAdvanced).map(([group, metrics]) => <fieldset key={group} className="space-y-3"><legend className="font-semibold text-slate-300">{group}</legend>{metrics?.map((metric) => <MetricInput key={metric.key} metricKey={metric.key} values={values} setValues={setValues} />)}</fieldset>)}</div></details>
      <label className="mt-4 block text-sm font-medium">Context note<textarea rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} className={input} placeholder="Alcohol, late meal, illness, training load, stress, medication, travel…" /></label>
      <button disabled={busy} className="mt-4 min-h-11 rounded-lg bg-teal-400 px-5 py-2 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Save encrypted check-in"}</button>
    </form>

    <div className="mt-7 border-t border-slate-800 pt-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><h4 className="text-lg font-semibold">Health history</h4><p className="mt-1 text-sm text-slate-400">One year is loaded for trends. Nothing is inferred when a reading is blank.</p></div>{latest && <button type="button" onClick={() => loadDate(latest.date)} className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm">Edit latest</button>}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{trendKeys.map((key) => { const metric = HEALTH_CHECK_IN_METRICS.find((item) => item.key === key)!; const points = entries.slice().reverse().map((entry) => entry.values[key]).filter((value): value is number => typeof value === "number"); const current = points.at(-1); return <article key={key} className="rounded-xl border border-slate-800 p-3"><div className="flex items-baseline justify-between gap-2"><h5 className="text-sm font-semibold">{metric.name}</h5><span className="text-sm text-teal-200">{current === undefined ? "—" : `${current} ${metric.unit}`}</span></div><Sparkline values={points.slice(-30)} /><p className="text-xs text-slate-500">{points.length} reading{points.length === 1 ? "" : "s"} · last 30 shown</p></article>; })}</div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-slate-500"><tr><th className="p-2">Date</th><th className="p-2">Total</th><th className="p-2">REM</th><th className="p-2">Deep</th><th className="p-2">Core</th><th className="p-2">Awake</th><th className="p-2">Efficiency</th><th className="p-2">RHR</th><th className="p-2">HRV</th></tr></thead><tbody>{entries.slice(0, 30).map((entry) => <tr key={entry.date} className="border-t border-slate-800"><td className="p-2"><button type="button" onClick={() => loadDate(entry.date)} className="min-h-11 text-teal-300 underline-offset-4 hover:underline">{entry.date}</button></td><td className="p-2">{entry.values.sleep_duration_hours ?? "—"}</td><td className="p-2">{entry.values.rem_minutes ?? "—"}</td><td className="p-2">{entry.values.deep_minutes ?? "—"}</td><td className="p-2">{entry.values.core_minutes ?? "—"}</td><td className="p-2">{entry.values.awake_minutes ?? "—"}</td><td className="p-2">{entry.values.sleep_efficiency_pct ?? "—"}</td><td className="p-2">{entry.values.resting_heart_rate ?? "—"}</td><td className="p-2">{entry.values.hrv_ms ?? "—"}</td></tr>)}{!entries.length && <tr><td colSpan={9} className="border-t border-slate-800 p-4 text-slate-400">No health history yet. Your first saved check-in will start the trend lines.</td></tr>}</tbody></table></div>
    </div>
  </section>;
}
