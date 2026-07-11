import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getClientSession } from "@/lib/current-session";
import PortalLogoutButton from "../../components/PortalLogoutButton";

export const dynamic = "force-dynamic";

// The core scoping rule for the whole portal: a client's slug is the ONLY
// way in, and every query below is filtered by that client's id. A client
// can never see another client's data, no matter how many hundreds of
// thousands of clients are in the system. Middleware already enforces the
// session-matches-slug check at the edge; this is the same check done
// again server-side so this page is safe even if it's ever reached by a
// path the middleware matcher doesn't cover.
export default async function ClientPortal({ params }: { params: { clientSlug: string } }) {
  const session = await getClientSession();
  if (!session || session.slug !== params.clientSlug) {
    redirect("/portal-login");
  }

  const client = await db.client.findUnique({
    where: { slug: params.clientSlug },
    include: {
      projects: {
        include: {
          milestones: { orderBy: { targetDate: "asc" } },
          updates: {
            where: { clientVisible: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
    },
  });

  if (!client) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Welcome back</p>
          <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
        </div>
        <PortalLogoutButton />
      </header>

      <div className="max-w-3xl mx-auto p-8 grid gap-8">
        {client.projects.map((project) => {
          const nextMilestone = project.milestones.find((m) => !m.completedAt);
          const doneCount = project.milestones.filter((m) => m.completedAt).length;

          return (
            <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-medium text-slate-900">{project.name}</h2>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {project.status.replace("_", " ")}
                </span>
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
                    {nextMilestone
                      ? `Next: ${nextMilestone.title}`
                      : "All milestones complete 🎉"}
                  </p>
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
                      <p className="text-xs text-slate-400">{u.createdAt.toLocaleDateString()}</p>
                    </div>
                  ))}
                  {project.updates.length === 0 && (
                    <p className="text-sm text-slate-400">No updates posted yet.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {client.projects.length === 0 && (
          <p className="text-center text-slate-400 py-12">No active projects yet.</p>
        )}
      </div>
    </main>
  );
}
