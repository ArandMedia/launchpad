import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      tasks: { orderBy: { createdAt: "asc" } },
      milestones: { orderBy: { targetDate: "asc" } },
      updates: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!project) notFound();

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {project.client.companyName || project.client.name} · {project.status}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          Tasks
        </h2>
        <div className="grid gap-2">
          {project.tasks.map((t) => (
            <div key={t.id} className="flex justify-between border border-slate-200 rounded px-4 py-2 text-sm">
              <span>{t.title}</span>
              <span className="text-slate-400">{t.status}</span>
            </div>
          ))}
          {project.tasks.length === 0 && <p className="text-sm text-slate-400">No tasks yet.</p>}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          Milestones
        </h2>
        <div className="grid gap-2">
          {project.milestones.map((m) => (
            <div key={m.id} className="flex justify-between border border-slate-200 rounded px-4 py-2 text-sm">
              <span>{m.title}</span>
              <span className="text-slate-400">
                {m.completedAt ? "Complete" : m.targetDate?.toLocaleDateString() || "TBD"}
                {m.clientVisible ? " · visible to client" : ""}
              </span>
            </div>
          ))}
          {project.milestones.length === 0 && (
            <p className="text-sm text-slate-400">No milestones yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          Update log
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Updates marked "client-visible" show on their portal and trigger a notification.
        </p>
        <div className="grid gap-2">
          {project.updates.map((u) => (
            <div key={u.id} className="border border-slate-200 rounded px-4 py-3 text-sm">
              <p>{u.body}</p>
              <p className="text-xs text-slate-400 mt-1">
                {u.createdAt.toLocaleString()} {u.clientVisible ? "· 👁 client-visible" : "· internal only"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
