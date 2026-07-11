import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ProjectPanels from "./ProjectPanels";

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

      <ProjectPanels
        projectId={project.id}
        tasks={project.tasks}
        milestones={project.milestones}
        updates={project.updates}
      />
    </main>
  );
}
