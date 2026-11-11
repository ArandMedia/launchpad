"use client";

import { useMemo, useRef, useState } from "react";
import { REPORT_CATALOG, type GeneratedReport, type ReportKey } from "@/lib/lifeos-reports";

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startForDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days + 1);
  return dateInput(date);
}

const input = "lifeos-editable mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/30";
const button = "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50";

function reportText(report: GeneratedReport) {
  return [
    report.title,
    report.periodLabel,
    report.summary,
    "",
    ...report.metrics.map((item) => `${item.label}: ${item.value} — ${item.detail}`),
    ...report.sections.flatMap((item) => ["", item.title, ...item.items.map((value) => `- ${value}`)]),
    "",
    "Data gaps",
    ...(report.gaps.length ? report.gaps.map((item) => `- ${item}`) : ["- No material gaps identified for this report."]),
    "",
    "Recommended next moves",
    ...report.recommendations.map((item) => `- ${item}`),
    "",
    "Sources",
    ...report.sources.map((item) => `- ${item}`),
  ].join("\n");
}

export default function ReportCenter() {
  const [start, setStart] = useState(() => startForDays(30));
  const [end, setEnd] = useState(() => dateInput(new Date()));
  const [selectedKey, setSelectedKey] = useState<ReportKey>("EXECUTIVE");
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const resultRef = useRef<HTMLElement>(null);
  const groups = useMemo(() => [...new Set(REPORT_CATALOG.map((item) => item.group))], []);

  function usePreset(days: number) {
    setStart(startForDays(days));
    setEnd(dateInput(new Date()));
  }

  async function generate(key: ReportKey) {
    setSelectedKey(key);
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/lifeos/reports?report=${encodeURIComponent(key)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to generate this report");
      setReport(data.report);
      setStatus(`${data.report.title} generated`);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate this report");
    } finally {
      setBusy(false);
    }
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportText(report));
      setStatus("Report copied");
    } catch {
      setError("Unable to copy this report on this device");
    }
  }

  return <section aria-labelledby="report-center-heading" className="mt-5 rounded-2xl border border-violet-700 bg-slate-900 p-4 sm:p-5 xl:p-6">
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Connected reporting</p>
        <h2 id="report-center-heading" className="mt-1 text-2xl font-semibold">Generate a report</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Reports combine existing LaunchPAD evidence without copying it. They distinguish recorded facts, missing inputs, and recommendations so a gap never looks like a fact.</p>
      </div>
      <span className="rounded-full border border-violet-800 bg-violet-950/40 px-3 py-1 text-xs font-semibold text-violet-200">{REPORT_CATALOG.length} report types</span>
    </div>

    <div className="mt-5 grid gap-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <label className="min-w-0 text-sm font-medium">From<input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} className={input} /></label>
      <label className="min-w-0 text-sm font-medium">Through<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} className={input} /></label>
      <div>
        <span className="block text-sm font-medium">Quick range</span>
        <div className="mt-1 flex flex-wrap gap-2">{[[7, "7d"], [30, "30d"], [90, "90d"], [365, "1y"]].map(([days, label]) => <button key={days} type="button" onClick={() => usePreset(Number(days))} className={`${button} border border-slate-600 px-3 text-sm hover:bg-slate-800`}>{label}</button>)}</div>
      </div>
    </div>

    {error && <p role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-950/30 p-3 text-red-200">{error}</p>}

    <div className="mt-6 space-y-6">
      {groups.map((group) => <section key={group} aria-labelledby={`report-group-${group.replaceAll(" ", "-").toLowerCase()}`}>
        <h3 id={`report-group-${group.replaceAll(" ", "-").toLowerCase()}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{group}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_CATALOG.filter((item) => item.group === group).map((item) => <article key={item.key} className={`flex min-h-52 flex-col rounded-xl border p-4 transition ${selectedKey === item.key ? "border-violet-500 bg-violet-950/25" : "border-slate-700 bg-slate-950/50"}`}>
            <div className="flex items-start justify-between gap-3"><span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-400/15 text-xl text-violet-200">{item.icon}</span>{selectedKey === item.key && <span className="rounded-full bg-violet-400 px-2 py-1 text-[10px] font-bold uppercase text-slate-950">Selected</span>}</div>
            <h4 className="mt-4 font-semibold text-slate-100">{item.title}</h4>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{item.description}</p>
            <button type="button" disabled={busy} onClick={() => generate(item.key)} className={`${button} mt-4 w-full ${selectedKey === item.key ? "bg-violet-400 text-slate-950 hover:bg-violet-300" : "border border-slate-600 hover:bg-slate-800"}`}>{busy && selectedKey === item.key ? "Generating…" : "Generate report"}</button>
          </article>)}
        </div>
      </section>)}
    </div>

    {report && <section ref={resultRef} id="generated-report" aria-labelledby="generated-report-heading" className="mt-8 scroll-mt-24 rounded-2xl border border-violet-600 bg-slate-950/70 p-4 shadow-2xl sm:p-5 xl:p-6 print:border-0 print:bg-white print:text-black print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300 print:text-slate-600">Generated report · {report.periodLabel}</p><h3 id="generated-report-heading" className="mt-1 text-2xl font-bold">{report.title}</h3><p className="mt-3 max-w-4xl leading-7 text-slate-300 print:text-slate-700">{report.summary}</p></div>
        <div className="flex flex-wrap gap-2 print:hidden"><button type="button" onClick={copyReport} className={`${button} border border-slate-600 text-sm hover:bg-slate-800`}>Copy</button><button type="button" onClick={() => window.print()} className={`${button} bg-violet-400 text-sm text-slate-950 hover:bg-violet-300`}>Print / Save PDF</button></div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{report.metrics.map((item) => <article key={item.label} className={`rounded-xl border p-4 ${item.tone === "good" ? "border-emerald-800 bg-emerald-950/20" : item.tone === "warning" ? "border-amber-800 bg-amber-950/20" : "border-slate-700 bg-slate-900/80"}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p><p className="mt-2 text-2xl font-bold">{item.value}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p></article>)}</div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">{report.sections.map((item) => <section key={item.title} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"><h4 className="font-semibold">{item.title}</h4>{item.items.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{item.items.map((value, index) => <li key={`${index}:${value}`} className="flex gap-2"><span aria-hidden="true" className="text-violet-300">•</span><span>{value}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Nothing material was found for this section.</p>}</section>)}</div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-amber-900 bg-amber-950/15 p-4"><h4 className="font-semibold text-amber-200">Data gaps</h4><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{(report.gaps.length ? report.gaps : ["No material data gaps identified for this report."]).map((item) => <li key={item}>• {item}</li>)}</ul></section>
        <section className="rounded-xl border border-emerald-900 bg-emerald-950/15 p-4"><h4 className="font-semibold text-emerald-200">Recommended next moves</h4><ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{report.recommendations.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}</ol></section>
        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"><h4 className="font-semibold">Sources used</h4><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">{report.sources.map((item) => <li key={item}>• {item}</li>)}</ul><p className="mt-4 text-xs leading-5 text-slate-500">Generated reports are decision support, not accounting, medical, or legal records.</p></section>
      </div>
    </section>}
  </section>;
}
