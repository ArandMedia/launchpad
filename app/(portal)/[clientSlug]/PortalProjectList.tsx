"use client";

import { useMemo, useState } from "react";

const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  CONTRACT: "Contract",
  INVOICE: "Invoice",
  SOW: "SOW",
  OTHER: "Other",
};

type Milestone = {
  id: string;
  title: string;
  targetDate: Date | null;
  completedAt: Date | null;
};
type Update = { id: string; body: string; createdAt: Date };
type Document = { id: string; title: string; category: string };
type Project = {
  id: string;
  name: string;
  status: string;
  problem: string | null;
  solution: string | null;
  desiredOutcome: string | null;
  archivedAt: Date | null;
  milestones: Milestone[];
  updates: Update[];
  documents: Document[];
};

export default function PortalProjectList({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.status, p.problem, p.solution, p.desiredOutcome]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    );
  }, [projects, query]);

  return (
    <>
      {projects.length > 1 && (
        <input
          type="search"
          placeholder="Search your projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white"
        />
      )}

      {filtered.map((project) => {
        const nextMilestone = project.milestones.find((m) => !m.completedAt);
        const doneCount = project.milestones.filter((m) => m.completedAt).length;
        const hasScope = project.problem || project.solution || project.desiredOutcome;

        return (
          <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-medium text-slate-900">{project.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {project.archivedAt && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Archived</span>}
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{project.status.replace("_", " ")}</span>
              </div>
            </div>

            {project.milestones.length > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${(doneCount / project.milestones.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {nextMilestone ? `Next: ${nextMilestone.title}` : "All milestones complete 🎉"}
                </p>
              </div>
            )}

            {hasScope && (
              <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4">
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

            <div className="mt-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Latest updates
              </h3>
              <div className="grid gap-2">
                {project.updates.map((u) => (
                  <div key={u.id} className="text-sm border-l-2 border-blue-200 pl-3 py-1">
                    <p className="text-slate-700">{u.body}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {project.updates.length === 0 && (
                  <p className="text-sm text-slate-400">No updates posted yet.</p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Documents
              </h3>
              <div className="grid gap-2">
                {project.documents.map((d) => (
                  <a
                    key={d.id}
                    href={`/api/documents/${d.id}/download`}
                    className="flex items-center justify-between text-sm border border-slate-200 rounded px-3 py-2 hover:border-blue-300 transition-colors"
                  >
                    <span className="text-slate-700 truncate">{d.title}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0 ml-2">
                      {DOCUMENT_CATEGORY_LABELS[d.category] || d.category}
                    </span>
                  </a>
                ))}
                {project.documents.length === 0 && (
                  <p className="text-sm text-slate-400">No documents shared yet.</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {projects.length === 0 && (
        <p className="text-center text-slate-400 py-12">No active projects yet.</p>
      )}

      {projects.length > 0 && filtered.length === 0 && (
        <p className="text-center text-slate-400 py-12">No projects match "{query}".</p>
      )}
    </>
  );
}
