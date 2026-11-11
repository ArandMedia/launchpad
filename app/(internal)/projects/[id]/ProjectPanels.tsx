"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Task = { id: string; title: string; status: string; dueDate: Date | null };
type Milestone = {
  id: string;
  title: string;
  targetDate: Date | null;
  completedAt: Date | null;
  clientVisible: boolean;
};
type Update = { id: string; body: string; clientVisible: boolean; createdAt: Date };
type Document = {
  id: string;
  title: string;
  category: string;
  url: string;
  fileName: string;
  fileSize: number;
  clientVisible: boolean;
  createdAt: Date;
};

const CATEGORY_LABELS: Record<string, string> = {
  CONTRACT: "Contract",
  INVOICE: "Invoice",
  SOW: "SOW",
  OTHER: "Other",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectPanels({
  projectId,
  tasks,
  milestones,
  updates,
  documents,
}: {
  projectId: string;
  tasks: Task[];
  milestones: Milestone[];
  updates: Update[];
  documents: Document[];
}) {
  const router = useRouter();

  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("OTHER");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docVisible, setDocVisible] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneBusy, setMilestoneBusy] = useState(false);

  const [updateBody, setUpdateBody] = useState("");
  const [updateVisible, setUpdateVisible] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setTaskBusy(true);
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle }),
    });
    setTaskTitle("");
    setTaskBusy(false);
    router.refresh();
  }

  async function toggleTask(task: Task) {
    const next = task.status === "DONE" ? "TODO" : "DONE";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  async function deleteTask(task: Task, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;
    setMilestoneBusy(true);
    await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: milestoneTitle, targetDate: milestoneDate || undefined }),
    });
    setMilestoneTitle("");
    setMilestoneDate("");
    setMilestoneBusy(false);
    router.refresh();
  }

  async function toggleMilestone(milestone: Milestone) {
    await fetch(`/api/milestones/${milestone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !milestone.completedAt }),
    });
    router.refresh();
  }

  async function deleteMilestone(milestone: Milestone, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete milestone "${milestone.title}"?`)) return;
    await fetch(`/api/milestones/${milestone.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function postUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updateBody.trim()) return;
    setUpdateBusy(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postUpdate: { body: updateBody, clientVisible: updateVisible },
      }),
    });
    setUpdateBody("");
    setUpdateVisible(false);
    setUpdateBusy(false);
    router.refresh();
  }

  async function deleteUpdate(update: Update) {
    if (!confirm("Delete this update? This does not unsend any notification email already sent.")) return;
    await fetch(`/api/updates/${update.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function uploadDocument(e: React.FormEvent) {
    e.preventDefault();
    setDocError(null);
    if (!docFile) {
      setDocError("Choose a file to upload.");
      return;
    }
    if (!docTitle.trim()) {
      setDocError("Give the document a title.");
      return;
    }
    setDocBusy(true);
    const formData = new FormData();
    formData.append("file", docFile);
    formData.append("title", docTitle);
    formData.append("category", docCategory);
    formData.append("clientVisible", String(docVisible));

    const res = await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      body: formData,
    });
    setDocBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDocError(data.error || "Upload failed.");
      return;
    }
    setDocTitle("");
    setDocCategory("OTHER");
    setDocFile(null);
    setDocVisible(false);
    router.refresh();
  }

  async function toggleDocVisibility(doc: Document) {
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientVisible: !doc.clientVisible }),
    });
    router.refresh();
  }

  async function deleteDocument(doc: Document) {
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <section className="lp-card mb-5">
        <h2 className="lp-section-heading mb-3">
          Tasks
        </h2>
        <div className="grid gap-2 mb-3">
          {tasks.map((t) => (
            <div
              key={t.id}
              onClick={() => toggleTask(t)}
              className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm transition-colors hover:border-violet-300"
            >
              <span className={t.status === "DONE" ? "line-through text-slate-400" : ""}>
                {t.title}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-slate-400">{t.status}</span>
                <button
                  onClick={(e) => deleteTask(t, e)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-slate-400">No tasks yet.</p>}
        </div>
        <form onSubmit={addTask} className="flex flex-wrap gap-2">
          <input
            className="lp-input min-w-[14rem] flex-1"
            placeholder="New task"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <button
            type="submit"
            disabled={taskBusy}
            className="lp-button-primary"
          >
            Add
          </button>
        </form>
      </section>

      <section className="lp-card mb-5">
        <h2 className="lp-section-heading mb-3">
          Milestones
        </h2>
        <div className="grid gap-2 mb-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              onClick={() => toggleMilestone(m)}
              className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm transition-colors hover:border-violet-300"
            >
              <span className={m.completedAt ? "line-through text-slate-400" : ""}>{m.title}</span>
              <span className="flex items-center gap-3">
                <span className="text-slate-400">
                  {m.completedAt
                    ? "Complete"
                    : m.targetDate
                    ? new Date(m.targetDate).toLocaleDateString()
                    : "TBD"}
                  {m.clientVisible ? " · visible to client" : ""}
                </span>
                <button
                  onClick={(e) => deleteMilestone(m, e)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
          {milestones.length === 0 && (
            <p className="text-sm text-slate-400">No milestones yet.</p>
          )}
        </div>
        <form onSubmit={addMilestone} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
          <input
            className="lp-input"
            placeholder="New milestone"
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
          />
          <input
            type="date"
            className="lp-input"
            value={milestoneDate}
            onChange={(e) => setMilestoneDate(e.target.value)}
          />
          <button
            type="submit"
            disabled={milestoneBusy}
            className="lp-button-primary"
          >
            Add
          </button>
        </form>
      </section>

      <section className="lp-card mb-5">
        <h2 className="lp-section-heading mb-2">
          Update log
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Updates marked "client-visible" show on their portal and trigger a notification.
        </p>
        <div className="grid gap-2 mb-3">
          {updates.map((u) => (
            <div key={u.id} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p>{u.body}</p>
                <button
                  onClick={() => deleteUpdate(u)}
                  className="text-xs text-red-500 hover:underline shrink-0"
                >
                  Delete
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(u.createdAt).toLocaleString()}{" "}
                {u.clientVisible ? "· 👁 client-visible" : "· internal only"}
              </p>
            </div>
          ))}
          {updates.length === 0 && <p className="text-sm text-slate-400">No updates yet.</p>}
        </div>
        <form onSubmit={postUpdate} className="grid gap-2">
          <textarea
            className="lp-input"
            placeholder="Write an update…"
            rows={3}
            value={updateBody}
            onChange={(e) => setUpdateBody(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={updateVisible}
              onChange={(e) => setUpdateVisible(e.target.checked)}
            />
            Visible to client (sends a notification email)
          </label>
          <button
            type="submit"
            disabled={updateBusy}
            className="lp-button-primary w-fit"
          >
            Post update
          </button>
        </form>
      </section>

      <section className="lp-card">
        <h2 className="lp-section-heading mb-2">
          Documents
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Contracts, invoices, SOWs, and other files for this project only. Hidden from the
          client until you mark them visible.
        </p>
        <div className="grid gap-2 mb-4">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {CATEGORY_LABELS[d.category] || d.category}
                  </span>
                  <a
                    href={`/api/documents/${d.id}/download`}
                    className="font-medium text-slate-900 hover:underline truncate"
                  >
                    {d.title}
                  </a>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {d.fileName} · {formatBytes(d.fileSize)} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <button
                  onClick={() => toggleDocVisibility(d)}
                  className={`text-xs font-medium ${
                    d.clientVisible ? "text-blue-600" : "text-slate-400"
                  } hover:underline`}
                >
                  {d.clientVisible ? "👁 client-visible" : "internal only"}
                </button>
                <button
                  onClick={() => deleteDocument(d)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-slate-400">No documents uploaded yet.</p>
          )}
        </div>
        <form onSubmit={uploadDocument} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <input
              className="lp-input"
              placeholder="Document title (e.g. Master Services Agreement)"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
            />
            <select
              className="lp-input"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
            >
              <option value="CONTRACT">Contract</option>
              <option value="INVOICE">Invoice</option>
              <option value="SOW">SOW</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <input
            type="file"
            className="text-sm"
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={docVisible}
              onChange={(e) => setDocVisible(e.target.checked)}
            />
            Visible to client
          </label>
          {docError && <p className="text-xs text-red-500">{docError}</p>}
          <button
            type="submit"
            disabled={docBusy}
            className="lp-button-primary w-fit"
          >
            {docBusy ? "Uploading…" : "Upload document"}
          </button>
        </form>
      </section>
    </>
  );
}
