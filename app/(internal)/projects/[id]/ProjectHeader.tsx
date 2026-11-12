"use client";

import { useState } from "react";
import { clientApi, clientErrorMessage } from "@/lib/client-api";

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
  const [editing, setEditing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");

  function cancelEditing() {
    setError("");
    setEditing(false);
  }

  async function toggleArchive() {
    const archiving = !project.archivedAt;
    if (archiving && !confirm("Archive this project? It stays intact and stays visible on the client's portal — it just drops out of your default project list. You can unarchive any time.")) {
      return;
    }
    setError("");
    setActionBusy(true);
    try {
      await clientApi(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archiving }),
      });
      window.location.reload();
    } catch (caught) {
      setError(clientErrorMessage(caught));
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteProject() {
    if (
      !confirm(
        `Permanently delete "${project.name}"? This removes all its tasks, milestones, updates, and documents. This can't be undone. Archiving is the reversible alternative.`
      )
    ) {
      return;
    }
    setError("");
    setActionBusy(true);
    try {
      await clientApi(`/api/projects/${project.id}`, { method: "DELETE" });
      window.location.assign("/?view=projects");
    } catch (caught) {
      setError(clientErrorMessage(caught));
      setActionBusy(false);
    }
  }

  if (editing) {
    return (
      <form
        action={`/api/projects/${project.id}`}
        method="post"
        encType="multipart/form-data"
        className="lp-card mb-6 mt-5 grid gap-4"
      >
        <input
          name="name"
          className="lp-input font-medium"
          defaultValue={project.name}
          maxLength={200}
          required
        />
        <textarea
          name="description"
          className="lp-input"
          placeholder="Description"
          rows={2}
          defaultValue={project.description || ""}
        />

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Scope (shown to the client too)
          </p>
          <label className="text-xs text-slate-500">
            Problem
            <textarea
              name="problem"
              className="lp-input mt-1"
              placeholder="What problem are we solving?"
              rows={2}
              defaultValue={project.problem || ""}
            />
          </label>
          <label className="text-xs text-slate-500">
            Solution
            <textarea
              name="solution"
              className="lp-input mt-1"
              placeholder="What are we building?"
              rows={2}
              defaultValue={project.solution || ""}
            />
          </label>
          <label className="text-xs text-slate-500">
            Desired outcome
            <textarea
              name="desiredOutcome"
              className="lp-input mt-1"
              placeholder="What does done look like?"
              rows={2}
              defaultValue={project.desiredOutcome || ""}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <select
            name="status"
            className="lp-input"
            defaultValue={project.status}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            name="startDate"
            type="date"
            className="lp-input"
            defaultValue={toDateInput(project.startDate)}
          />
          <input
            name="targetDate"
            type="date"
            className="lp-input"
            defaultValue={toDateInput(project.targetDate)}
          />
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-5 sm:px-5">
          <button
            type="submit"
            className="lp-button-primary"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={cancelEditing}
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
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
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
          <button disabled={actionBusy} onClick={() => { setError(""); setEditing(true); }} className="lp-button-secondary">
            Edit
          </button>
          <button disabled={actionBusy} onClick={toggleArchive} className="lp-button-ghost disabled:opacity-50">
            {project.archivedAt ? "Unarchive" : "Archive"}
          </button>
          <button disabled={actionBusy} onClick={deleteProject} className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-800 disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
