import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProjectPanels from "./ProjectPanels";
import ProjectHeader from "./ProjectHeader";
import { getTeamSession } from "@/lib/current-session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";
import { LIFEOS_TIME_ZONE } from "@/lib/lifeos-time";

export default async function ProjectDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      tasks: { orderBy: { createdAt: "asc" } },
      milestones: { orderBy: { targetDate: "asc" } },
      updates: { orderBy: { createdAt: "desc" }, take: 20 },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  const session = await getTeamSession();
  const ownerId = isLifeOSOwner(session) ? session.userId : null;
  const scheduledBlocks = ownerId ? await db.lifeOSTimeBlock.findMany({
    where: {
      ownerId,
      projectId: project.id,
      status: { notIn: ["COMPLETED", "SKIPPED"] },
      endAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    include: { task: true, milestone: true },
  }) : [];

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <Link href="/?view=projects" className="text-sm text-slate-400 hover:text-slate-700">
        ← Back to projects
      </Link>
      <ProjectHeader
        project={project}
        clientLabel={project.client.companyName || project.client.name}
      />

      {ownerId && <section className="mb-8 rounded-xl border border-violet-200 bg-violet-50/60 p-5" aria-labelledby="project-schedule-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Connected calendar</p>
            <h2 id="project-schedule-heading" className="mt-1 text-lg font-semibold text-slate-900">Scheduled project work</h2>
            <p className="mt-1 text-sm text-slate-600">Work sessions appear here without changing task or milestone completion.</p>
          </div>
          <Link href="/lifeos/today" className="inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600">Open Calendar</Link>
        </div>
        {scheduledBlocks.length ? <div className="mt-4 grid gap-2">
          {scheduledBlocks.map((block) => <article key={block.id} className="rounded-lg border border-violet-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{block.title}</p>
                <p className="mt-1 text-xs text-slate-500">{block.task ? `Task · ${block.task.title}` : block.milestone ? `Milestone · ${block.milestone.title}` : "Project work"}</p>
              </div>
              <p className="text-sm font-medium text-violet-800">{new Intl.DateTimeFormat("en-US", { timeZone: LIFEOS_TIME_ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(block.startAt)}</p>
            </div>
          </article>)}
        </div> : <p className="mt-4 rounded-lg border border-dashed border-violet-300 bg-white/70 p-4 text-sm text-slate-600">Nothing is scheduled yet. Open Calendar and use Project Agenda to add a work block.</p>}
      </section>}

      <ProjectPanels
        projectId={project.id}
        tasks={project.tasks}
        milestones={project.milestones}
        updates={project.updates}
        documents={project.documents}
      />
    </main>
  );
}
