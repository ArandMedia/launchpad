"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUSES = ["DISCOVERY", "IN_PROGRESS", "REVIEW", "BLOCKED", "COMPLETE"];

type Project = {
  id: string;
  name: string;
  description: string | null;
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
      <form onSubmit={save} className="mb-6 mt-2 grid gap-2 border border-slate-200 rounded-lg p-4 bg-white">
        <input
          className="border border-slate-300 rounded px-3 py-1.5 text-sm font-medium"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          placeholder="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
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
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm w-fit disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-slate-500 px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mb-6 mt-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
            {project.archivedAt && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
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
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setEditing(true)} className="text-sm text-slate-500 hover:underline">
            Edit
          </button>
          <button onClick={toggleArchive} className="text-sm text-slate-500 hover:underline">
            {project.archivedAt ? "Unarchive" : "Archive"}
          </button>
          <button onClick={deleteProject} className="text-sm text-red-500 hover:underline">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
