"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUSES = ["DISCOVERY", "IN_PROGRESS", "REVIEW", "BLOCKED", "COMPLETE"];

type Project = {
  id: string;
  name: string;
  description: string | null;
  problem: string | null;
  solution: string | null;
  desiredOutcome: string | null;
  status: string;
  startDate: Date | null;
  targetDate: Date | null;
  archivedAt: Date | null;
};

function toDateInput(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function ProjectHeader({
  project,
  clientLabel,
}: {
  project: Project;
  clientLabel: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [problem, setProblem] = useState(project.problem || "");
  const [solution, setSolution] = useState(project.solution || "");
  const [desiredOutcome, setDesiredOutcome] = useState(project.desiredOutcome || "");
  const [status, setStatus] = useState(project.status);
  const [startDate, setStartDate] = useState(toDateInput(project.startDate));
  const [targetDate, setTargetDate] = useState(toDateInput(project.targetDate));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        problem,
        solution,
        desiredOutcome,
        status,
        startDate: startDate || null,
        targetDate: targetDate || null,
      }),
    });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  async function toggleArchive() {
    const archiving = !project.archivedAt;
    if (archiving && !confirm("Archive this project? It stays intact and stays visible on the client's portal — it just drops out of your default project list. You can unarchive any time.")) {
      return;
    }
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: archiving }),
    });
    router.refresh();
  }

  async function deleteProject() {
    if (
      !confirm(
        `Permanently delete "${project.name}"? This removes all its tasks, milestones, updates, and documents. This can't be undone. Archiving is the reversible alternative.`
      )
    ) {
      return;
    }
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/");
  }

  if (editing) {
    return (
      <form onSubmit={save} className="lp-card mb-6 mt-5 grid gap-4">
        <input
          className="lp-input font-medium"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="lp-input"
          placeholder="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Scope (shown to the client too)
          </p>
          <label className="text-xs text-slate-500">
            Problem
            <textarea
              className="lp-input mt-1"
              placeholder="What problem are we solving?"
              rows={2}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Solution
            <textarea
              className="lp-input mt-1"
              placeholder="What are we building?"
              rows={2}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Desired outcome
            <textarea
              className="lp-input mt-1"
              placeholder="What does done look like?"
              rows={2}
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <select
            className="lp-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="lp-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="lp-input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="lp-button-primary"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="lp-button-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="lp-card mb-6 mt-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{project.name}</h1>
            {project.archivedAt && (
              <span className="lp-badge border-slate-200 bg-slate-100 text-slate-600">
                Archived
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {clientLabel} · {project.status.replace("_", " ")}
          </p>
          {project.description && (
            <p className="text-slate-600 text-sm mt-2 max-w-2xl">{project.description}</p>
          )}
          {(project.problem || project.solution || project.desiredOutcome) && (
            <div className="grid gap-2 mt-4 max-w-2xl">
              {project.problem && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Problem
                  </p>
                  <p className="text-sm text-slate-700 mt-0.5">{project.problem}</p>
                </div>
              )}
              {project.solution && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Solution
                  </p>
                  <p className="text-sm text-slate-700 mt-0.5">{project.solution}</p>
                </div>
              )}
              {project.desiredOutcome && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Desired outcome
                  </p>
                  <p className="text-sm text-slate-700 mt-0.5">{project.desiredOutcome}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="lp-button-secondary">
            Edit
          </button>
          <button onClick={toggleArchive} className="lp-button-ghost">
            {project.archivedAt ? "Unarchive" : "Archive"}
          </button>
          <button onClick={deleteProject} className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-800">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
