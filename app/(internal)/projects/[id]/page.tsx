import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProjectPanels from "./ProjectPanels";
import ProjectHeader from "./ProjectHeader";

export default async function ProjectDetail({ params }: { params: { id: string } }) {
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

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-700">
        ← Back to projects
      </Link>
      <ProjectHeader
        project={project}
        clientLabel={project.client.companyName || project.client.name}
      />

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
