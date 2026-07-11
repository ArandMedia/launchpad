import { db } from "@/lib/db";
import Link from "next/link";
import ProjectsList from "./ProjectsList";

export const dynamic = "force-dynamic";

// Server component — fetches first page directly. The client-side
// dashboard can later swap to SWR + the /api/projects cursor endpoint
// for infinite scroll once volume grows.
export default async function InternalDashboard({
  searchParams,
}: {
  searchParams: { archived?: string };
}) {
  const showArchived = searchParams.archived === "1";

  const projects = await db.project.findMany({
    take: 50,
    where: showArchived ? { archivedAt: { not: null } } : { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { name: true, companyName: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
  });

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {showArchived ? "Archived projects" : "Projects"}
        </h1>
        <Link
          href={showArchived ? "/" : "/?archived=1"}
          className="text-sm text-slate-400 hover:text-slate-700"
        >
          {showArchived ? "← Back to active projects" : "View archived →"}
        </Link>
      </div>

      <ProjectsList
        projects={projects}
        emptyLabel={
          showArchived ? (
            "No archived projects."
          ) : (
            <>
              No projects yet.{" "}
              <Link href="/projects/new" className="underline">
                Create your first one →
              </Link>
            </>
          )
        }
      />
    </main>
  );
}
