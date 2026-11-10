"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { DOMAIN_LABELS, INTEGRATION_ADAPTERS, type LifeOSDomainKey } from "@/lib/lifeos-domains";

type Core = {
  domains: Array<{ domainKey: LifeOSDomainKey; currentState: string; desiredState: string; gap: string }>;
  goals: Array<{ id: string; domainKey: LifeOSDomainKey; title: string; done: boolean }>;
  actions: Array<{ id: string; domainKey: LifeOSDomainKey; title: string; status: string }>;
  metrics: Array<{ id: string; domainKey: LifeOSDomainKey; name: string }>;
  integrations: Array<{ providerKey: string; status: string; scopes: string[]; retentionDays: number }>;
  reviewCycles: Array<{ id: string; period: string; periodStart: string; domainKey: LifeOSDomainKey | null; observation: string; recommendation: string; decision: string }>;
  activities: Array<{ id: string; domainKey: LifeOSDomainKey; summary: string; action: string; createdAt: string }>;
};

const domainHref: Record<LifeOSDomainKey, string> = { HEALTH: "/lifeos/pillars/health", WEALTH: "/lifeos/pillars/wealth", RELATIONSHIPS: "/lifeos/pillars/relationships", SELF: "/lifeos/self", ARANDMEDIA: "/lifeos/arandmedia", OMNIS: "/lifeos/omnis" };
const button = "min-h-11 rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";
const input = "lifeos-editable mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-teal-300 focus:outline-none";

function useCore() {
  const [data, setData] = useState<Core | null>(null); const [error, setError] = useState("");
  async function refresh() { const response = await fetch("/api/lifeos/core", { cache: "no-store" }); if (!response.ok) throw new Error("Unable to load LifeOS context"); setData(await response.json()); }
  useEffect(() => { refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load")); }, []);
  return { data, error, refresh };
}

export function DomainSummary({ domains, compact = false }: { domains: LifeOSDomainKey[]; compact?: boolean }) {
  const { data, error } = useCore();
  if (error) return <p role="alert" className="rounded-xl border border-red-700 p-3 text-red-300">{error}</p>;
  if (!data) return <p className="rounded-xl border border-slate-800 p-4 text-slate-400" role="status">Loading operating context…</p>;
  return <div className={`grid gap-4 ${compact ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
    {domains.map((key) => { const state = data.domains.find((item) => item.domainKey === key); const outcomes = data.goals.filter((item) => item.domainKey === key && !item.done); const actions = data.actions.filter((item) => item.domainKey === key && item.status === "OPEN"); return <Link key={key} href={domainHref[key]} className="group min-h-36 rounded-2xl border border-slate-700 bg-slate-900 p-4 transition hover:border-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold group-hover:text-teal-200">{DOMAIN_LABELS[key]}</h3><span className="text-sm text-slate-500">{outcomes.length} outcome{outcomes.length === 1 ? "" : "s"}</span></div>
      <p className="mt-3 line-clamp-2 text-sm text-slate-400">{state?.currentState || "Current state not established yet."}</p><p className="mt-3 text-xs text-slate-500">{actions.length} open next action{actions.length === 1 ? "" : "s"} · Open workspace →</p>
    </Link>; })}
  </div>;
}

export function TodayContext() {
  const { data, error } = useCore();
  if (error) return <p role="alert" className="rounded-xl border border-red-700 p-3 text-red-300">{error}</p>;
  if (!data) return <p role="status" className="rounded-xl border border-slate-800 p-4 text-slate-400">Loading daily priorities…</p>;
  const actions = data.actions.filter((item) => item.status === "OPEN").slice(0, 6);
  return <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Daily priorities & context</h3><p className="mt-1 text-sm text-slate-400">Actions are sourced from domain workspaces. Schedule them into time blocks when they become today’s work.</p></div><Link href="/lifeos/pillars" className={`${button} border border-slate-600 text-sm hover:bg-slate-800`}>Open pillars</Link></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{actions.length ? actions.map((item) => <Link key={item.id} href={domainHref[item.domainKey]} className="min-h-11 rounded-lg border border-slate-800 p-3 hover:bg-slate-800"><span className="text-xs font-semibold uppercase tracking-wide text-teal-300">{DOMAIN_LABELS[item.domainKey]}</span><span className="mt-1 block text-sm">{item.title}</span></Link>) : <p className="md:col-span-2 xl:col-span-3 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No domain actions are waiting. Your agenda can stay open or you can define the next meaningful action inside a workspace.</p>}</div>
  </section>;
}

export function IntegrationsPanel() {
  const { data, error, refresh } = useCore();
  const [mutationError, setMutationError] = useState("");
  async function mutate(method: "PATCH" | "DELETE", body: object) {
    setMutationError("");
    const response = await fetch("/api/lifeos/core", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { setMutationError("Unable to update this connection"); return; }
    await refresh();
  }
  if (error) return <p role="alert" className="rounded-xl border border-red-700 p-3 text-red-300">{error}</p>;
  return <>
    {mutationError && <p role="alert" className="mt-5 rounded-xl border border-red-700 p-3 text-red-300">{mutationError}</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">{INTEGRATION_ADAPTERS.map((adapter) => {
      const saved = data?.integrations.find((item) => item.providerKey === adapter.key);
      const connected = saved?.status === "CONNECTED";
      return <article key={adapter.key} className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{DOMAIN_LABELS[adapter.domainKey]}</p><h3 className="mt-1 font-semibold">{adapter.label}</h3></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${connected ? "border-teal-700 bg-teal-950/30 text-teal-200" : "border-amber-800 bg-amber-950/30 text-amber-200"}`}>{connected ? "Connected" : "Not connected"}</span></div><p className="mt-3 text-sm leading-6 text-slate-400">{adapter.description}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Readiness</dt><dd className="mt-1">{adapter.readiness.replaceAll("_", " ").toLowerCase()}</dd></div><div><dt className="text-slate-500">Data scope</dt><dd className="mt-1">{saved?.scopes.length ? saved.scopes.join(", ") : "None authorized"}</dd></div></dl>
        {connected ? <button onClick={() => mutate("PATCH", { kind: "integration-disconnect", providerKey: adapter.key, domainKey: adapter.domainKey })} className={`${button} mt-4 w-full border border-amber-700 text-amber-200`}>Disconnect</button> : saved ? <button onClick={() => { if (window.confirm(`Delete the ${adapter.label} connection record and all evidence imported from it? Manual evidence will remain.`)) mutate("DELETE", { providerKey: adapter.key }); }} className={`${button} mt-4 w-full border border-red-800 text-red-300`}>Delete connection & imported data</button> : <button disabled className={`${button} mt-4 w-full border border-slate-700 text-slate-500`}>Authorization required</button>}
      </article>;
    })}</div>
  </>;
}

export function ReviewCycles() {
  const { data, error, refresh } = useCore(); const [period, setPeriod] = useState("WEEKLY"); const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10)); const [observation, setObservation] = useState(""); const [recommendation, setRecommendation] = useState(""); const [decision, setDecision] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); const response = await fetch("/api/lifeos/core", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "review-cycle", period, periodStart, observation, recommendation, decision }) }); setBusy(false); if (response.ok) { setObservation(""); setRecommendation(""); setDecision(""); await refresh(); } }
  if (error) return <p role="alert" className="text-red-300">{error}</p>;
  return <div className="mt-5 grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Review cycle</h3><p className="mt-1 text-sm text-slate-400">Keep observations separate from recommendations, then record the decision.</p><form onSubmit={submit} className="mt-4 grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><label>Period<select value={period} onChange={(e) => setPeriod(e.target.value)} className={input}><option>WEEKLY</option><option>MONTHLY</option><option>QUARTERLY</option></select></label><label>Period start<input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={input} /></label></div><label>Observation<textarea rows={3} value={observation} onChange={(e) => setObservation(e.target.value)} className={input} /></label><label>Recommendation<textarea rows={3} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} className={input} /></label><label>Decision<textarea rows={2} value={decision} onChange={(e) => setDecision(e.target.value)} className={input} /></label><button disabled={busy} className={`${button} bg-teal-400 text-slate-950`}>Save review cycle</button></form></section><section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><h3 className="text-lg font-semibold">Recent review decisions</h3><div className="mt-3 space-y-3">{data?.reviewCycles.length ? data.reviewCycles.map((item) => <article key={item.id} className="rounded-lg border border-slate-800 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-teal-300">{item.period.toLowerCase()} · {item.periodStart.slice(0, 10)}</p><p className="mt-2 text-sm"><span className="text-slate-500">Observation:</span> {item.observation || "—"}</p><p className="mt-1 text-sm"><span className="text-slate-500">Decision:</span> {item.decision || "—"}</p></article>) : <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No weekly, monthly, or quarterly reviews yet.</p>}</div></section></div>;
}
