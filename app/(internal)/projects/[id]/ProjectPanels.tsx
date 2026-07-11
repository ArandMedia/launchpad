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

export default function ProjectPanels({
  projectId,
  tasks,
  milestones,
  updates,
}: {
  projectId: string;
  tasks: Task[];
  milestones: Milestone[];
  updates: Update[];
}) {
  const router = useRouter();

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

  return (
    <>
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          Tasks
        </h2>
        <div className="grid gap-2 mb-3">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTask(t)}
              className="flex justify-between border border-slate-200 rounded px-4 py-2 text-sm text-left hover:border-slate-400 transition-colors"
            >
              <span className={t.status === "DONE" ? "line-through text-slate-400" : ""}>
                {t.title}
              </span>
              <span className="text-slate-400">{t.status}</span>
            </button>
          ))}
          {tasks.length === 0 && <p className="text-sm text-slate-400">No tasks yet.</p>}
        </div>
        <form onSubmit={addTask} className="flex gap-2">
          <input
            className="border border-slate-300 rounded px-3 py-1.5 text-sm flex-1"
            placeholder="New task"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <button
            type="submit"
            disabled={taskBusy}
            className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          Milestones
        </h2>
        <div className="grid gap-2 mb-3">
          {milestones.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleMilestone(m)}
              className="flex justify-between border border-slate-200 rounded px-4 py-2 text-sm text-left hover:border-slate-400 transition-colors"
            >
              <span className={m.completedAt ? "line-through text-slate-400" : ""}>{m.title}</span>
              <span className="text-slate-400">
                {m.completedAt
                  ? "Complete"
                  : m.targetDate
                  ? new Date(m.targetDate).toLocaleDateString()
                  : "TBD"}
                {m.clientVisible ? " · visible to client" : ""}
              </span>
            </button>
          ))}
          {milestones.length === 0 && (
            <p className="text-sm text-slate-400">No milestones yet.</p>
          )}
        </div>
        <form onSubmit={addMilestone} className="flex gap-2">
          <input
            className="border border-slate-300 rounded px-3 py-1.5 text-sm flex-1"
            placeholder="New milestone"
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
          />
          <input
            type="date"
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            value={milestoneDate}
            onChange={(e) => setMilestoneDate(e.target.value)}
          />
          <button
            type="submit"
            disabled={milestoneBusy}
            className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          Update log
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Updates marked "client-visible" show on their portal and trigger a notification.
        </p>
        <div className="grid gap-2 mb-3">
          {updates.map((u) => (
            <div key={u.id} className="border border-slate-200 rounded px-4 py-3 text-sm">
              <p>{u.body}</p>
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
            className="border border-slate-300 rounded px-3 py-2 text-sm"
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
            className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm w-fit disabled:opacity-50"
          >
            Post update
          </button>
        </form>
      </section>
    </>
  );
}
