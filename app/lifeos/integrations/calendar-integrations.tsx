"use client";

import { useEffect, useState, type FormEvent } from "react";

type Feed = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  lastSyncedAt: string | null;
  lastError: string;
};

const input = "mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/40";
const button = "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50";

function syncLabel(value: string | null) {
  if (!value) return "Not synced yet";
  return `Last synced ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))}`;
}

export default function CalendarIntegrations() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading calendars…");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/lifeos/calendar-feeds", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load calendar integrations");
    const data = await response.json();
    setFeeds(data.feeds ?? []);
  }

  useEffect(() => {
    load().then(() => setMessage("")).catch((caught) => { setMessage(""); setError(caught instanceof Error ? caught.message : "Unable to load calendars"); });
  }, []);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("Checking the calendar feed…");
    try {
      const response = await fetch("/api/lifeos/calendar-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, color }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Unable to connect calendar");
      setName(""); setUrl(""); setMessage("Calendar connected");
      await load();
    } catch (caught) {
      setMessage(""); setError(caught instanceof Error ? caught.message : "Unable to connect calendar");
    } finally { setBusy(false); }
  }

  async function save(feed: Feed) {
    setBusy(true); setError(""); setMessage("Saving calendar style…");
    try {
      const response = await fetch("/api/lifeos/calendar-feeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feed.id, name: feed.name, color: feed.color }),
      });
      if (!response.ok) throw new Error("Unable to update calendar");
      setMessage("Calendar label and color saved");
      await load();
    } catch (caught) { setMessage(""); setError(caught instanceof Error ? caught.message : "Unable to update calendar"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setError(""); setMessage("Removing calendar…");
    try {
      const response = await fetch("/api/lifeos/calendar-feeds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Unable to remove calendar");
      setConfirmRemove(null); setMessage("Calendar removed");
      await load();
    } catch (caught) { setMessage(""); setError(caught instanceof Error ? caught.message : "Unable to remove calendar"); }
    finally { setBusy(false); }
  }

  return <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <section className="rounded-2xl border border-violet-800 bg-slate-900 p-4 sm:p-5" aria-labelledby="connect-calendar-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Public calendar feed</p>
      <h2 id="connect-calendar-heading" className="mt-1 text-xl font-semibold">Add a calendar</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Paste a public <strong className="text-slate-300">webcal</strong> or <strong className="text-slate-300">HTTPS</strong> subscription link. LaunchPAD encrypts the link, reads the schedule, and never writes back to the source.</p>
      <form onSubmit={connect} className="mt-4 space-y-4">
        <label className="block font-medium">Calendar label
          <input required maxLength={80} placeholder="Family, Work, School…" value={name} onChange={(event) => setName(event.target.value)} className={input} />
        </label>
        <label className="block font-medium">Public calendar link
          <input required inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="webcal://… or https://…" value={url} onChange={(event) => setUrl(event.target.value)} className={input} />
        </label>
        <label className="block font-medium">Calendar color
          <span className="mt-1 flex min-h-12 items-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-3">
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9 w-14 cursor-pointer rounded border-0 bg-transparent" />
            <span className="text-sm text-slate-300">Choose the color used for every event in this feed.</span>
          </span>
        </label>
        <button disabled={busy} className={`${button} w-full bg-violet-400 text-slate-950 hover:bg-violet-300`}>{busy ? "Connecting…" : "Connect calendar"}</button>
      </form>
      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm leading-6 text-slate-400">
        <p className="font-semibold text-slate-200">Finding the iPhone link</p>
        <p>In Apple Calendar, open the calendar’s details, enable <strong className="text-slate-300">Public Calendar</strong>, then copy the sharing link. Anyone with that link can read the calendar, so revoke it in Apple Calendar if it is ever exposed.</p>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="connected-calendars-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Read-only subscriptions</p><h2 id="connected-calendars-heading" className="mt-1 text-xl font-semibold">Connected calendars</h2></div>
        <button disabled={busy} onClick={() => { setMessage("Refreshing calendars…"); load().then(() => setMessage("Calendars refreshed")).catch(() => setError("Unable to refresh calendars")); }} className={`${button} border border-slate-600 text-sm hover:bg-slate-800`}>Refresh</button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{message}</p>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-950/30 p-3 text-red-200">{error}</p>}
      {message && <p className="mt-4 text-sm text-violet-200">{message}</p>}
      {!message && feeds.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-slate-600 p-5 text-slate-400">No public calendars are connected yet.</div>}
      <div className="mt-4 space-y-3">
        {feeds.map((feed, index) => <article key={feed.id} className="rounded-xl border border-slate-700 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <label className="font-medium">Label
              <input maxLength={80} value={feed.name} onChange={(event) => setFeeds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className={input} />
            </label>
            <label className="font-medium">Color
              <span className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-2">
                <input aria-label={`${feed.name} color`} type="color" value={feed.color} onChange={(event) => setFeeds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} className="h-8 w-full cursor-pointer rounded border-0 bg-transparent" />
              </span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={feed.lastError ? "text-amber-300" : "text-slate-400"}>{feed.lastError || syncLabel(feed.lastSyncedAt)}</span>
            <span className="rounded-full border px-2 py-1" style={{ borderColor: feed.color, color: feed.color }}>Read only</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => save(feed)} className={`${button} bg-violet-400 text-slate-950 hover:bg-violet-300`}>Save label & color</button>
            {confirmRemove !== feed.id ? <button disabled={busy} onClick={() => setConfirmRemove(feed.id)} className={`${button} border border-red-800 text-red-300 hover:bg-red-950/40`}>Remove</button> : <span className="flex flex-wrap items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 p-2"><span className="text-sm text-red-200">Remove this feed?</span><button disabled={busy} onClick={() => remove(feed.id)} className={`${button} bg-red-500 text-white`}>Confirm</button><button onClick={() => setConfirmRemove(null)} className={`${button} border border-slate-600`}>Keep</button></span>}
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
