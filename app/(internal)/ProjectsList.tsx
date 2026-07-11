"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const statusColor: Record<string, string> = {
  DISCOVERY: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  REVIEW: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
  COMPLETE: "bg-green-100 text-green-700",
};

type Project = {
  id: string;
  name: string;
  status: string;
  client: { name: string; companyName: string | null };
  _count: { tasks: number; milestones: number };
};

export default function ProjectsList({
  projects,
  emptyLabel,
}: {
  projects: Project[];
  emptyLabel: React.ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.status, p.client.name, p.client.companyName]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    );
  }, [projects, query]);

  return (
    <>
      {projects.length > 4 && (
        <input
          type="search"
          placeholder="Search projects by name, client, or status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm mb-4 w-full bg-white"
        />
      )}

      <div className="grid gap-3">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-4 hover:border-slate-400 transition-colors bg-white"
          >
            <div>
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-sm text-slate-500">
                {p.client.companyName || p.client.name} · {p._count.tasks} tasks ·{" "}
                {p._count.milestones} milestones
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[p.status]}`}
            >
              {p.status.replace("_", " ")}
            </span>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            {emptyLabel}
          </div>
        )}

        {projects.length > 0 && filtered.length === 0 && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            No projects match "{query}".
          </div>
        )}
      </div>
    </>
  );
}
