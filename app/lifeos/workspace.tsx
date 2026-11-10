"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Goal = {
  id: string;
  title: string;
  horizon: string;
  parentId: string | null;
  done: boolean;
  completedAt: string | null;
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
  const [horizon, setHorizon] = useState("SPRINT");
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState("");
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
    const saved = await submit({ kind: "goal", title, horizon, parentId: parentId || null });
    if (saved) {
      setTitle("");
      setParentId("");
      setStatus("Objective saved");
    }
  }

  async function addReview(event: FormEvent) {
    event.preventDefault();
    const saved = await submit({ kind: "review", date, intended, actual, learned, next });
    if (saved) setStatus("Daily review saved");
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
    "mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/40";
  const button =
    "min-h-11 touch-manipulation rounded-lg px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
      {error && (
        <p role="alert" className="rounded-lg border border-red-500 p-3 text-red-300 lg:col-span-2">{error}</p>
      )}

      <section aria-labelledby="planning-heading" className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
        <h2 id="planning-heading" className="text-xl font-semibold">Planning workspace</h2>
        <p className="mt-2 text-sm text-slate-400">Create outcomes across time horizons and connect them to a parent goal.</p>
        <form onSubmit={addGoal} className="mt-4 space-y-4">
          <label className="block font-medium">
            Objective
            <input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className={input} />
          </label>
          <label className="block font-medium">
            Horizon
            <select value={horizon} onChange={(event) => setHorizon(event.target.value)} className={input}>
              {horizons.map((item) => (
                <option key={item} value={item}>{item === "SPRINT" ? "13-week sprint" : item.toLowerCase()}</option>
              ))}
            </select>
          </label>
          <label className="block font-medium">
            Parent objective
            <select value={parentId} onChange={(event) => setParentId(event.target.value)} className={input}>
              <option value="">None</option>
              {goals.filter((goal) => !goal.done).map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy} className={`${button} bg-teal-400 text-slate-950 hover:bg-teal-300`}>Save objective</button>
        </form>

        <h3 className="mt-7 font-semibold">Objectives</h3>
        <div className="mt-3 space-y-3">
          {goals.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No objectives yet.</p>}
          {goals.map((goal) => (
            <article key={goal.id} className="rounded-lg border border-slate-700 p-4">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className={`break-words ${goal.done ? "text-slate-400 line-through" : "font-semibold"}`}>{goal.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {goal.horizon}{goal.parentId ? ` · Parent: ${goalNames.get(goal.parentId) ?? "unavailable"}` : ""}
                  </p>
                </div>
                <button type="button" disabled={busy} onClick={() => toggle(goal)} className={`${button} shrink-0 border border-slate-600 text-sm hover:bg-slate-800`}>
                  {goal.done ? "Reopen" : "Complete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="review-heading" className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
        <h2 id="review-heading" className="text-xl font-semibold">Daily After Action Review</h2>
        <p className="mt-2 text-sm text-slate-400">Choosing a saved date loads that review for editing.</p>
        <form onSubmit={addReview} className="mt-4 space-y-4">
          <label className="block font-medium">
            Date
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={input} />
          </label>
          {([
            ["What was intended?", intended, setIntended],
            ["What actually happened?", actual, setActual],
            ["What did you learn?", learned, setLearned],
            ["What changes next?", next, setNext],
          ] as const).map(([label, value, setter]) => (
            <label key={label} className="block font-medium">
              {label}
              <textarea maxLength={4000} value={value} onChange={(event) => setter(event.target.value)} className={input} rows={3} />
            </label>
          ))}
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
