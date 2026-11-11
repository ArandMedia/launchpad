import { db } from "@/lib/db";
import Link from "next/link";
import ProjectsList from "./ProjectsList";
import { getTeamSession } from "@/lib/current-session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";
import { redirect } from "next/navigation";
import { landingHref, parseUserPreferences } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

// Server component — fetches first page directly. The client-side
// dashboard can later swap to SWR + the /api/projects cursor endpoint
// for infinite scroll once volume grows.
export default async function InternalDashboard(
  props: {
    searchParams: Promise<{ archived?: string; view?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const showArchived = searchParams.archived === "1";
  const explicitlyOpenedProjects = searchParams.view === "projects" || showArchived;

  const session = await getTeamSession();
  if (session && !explicitlyOpenedProjects) {
    const canUseCalendar = isLifeOSOwner(session);
    const user = await db.user.findUnique({ where: { id: session.userId }, select: { preferences: true } });
    const landing = parseUserPreferences(user?.preferences, canUseCalendar).defaultLanding;
    if (landing !== "PROJECTS") redirect(landingHref(landing));
  }

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
    <main className="lp-page">
      <div className="lp-page-header">
        <div>
          <p className="lp-eyebrow">Work portfolio</p>
          <h1 className="lp-title">{showArchived ? "Archived projects" : "Projects"}</h1>
          <p className="lp-subtitle">Keep active work, client context, milestones, and delivery status in one consistent view.</p>
        </div>
        <Link
          href={showArchived ? "/?view=projects" : "/?view=projects&archived=1"}
          className="lp-button-secondary"
        >
          {showArchived ? "← Back to active projects" : "View archived"}
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
