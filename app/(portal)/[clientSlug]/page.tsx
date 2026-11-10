import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getClientSession } from "@/lib/current-session";
import PortalLogoutButton from "../../components/PortalLogoutButton";
import PortalProjectList from "./PortalProjectList";

export const dynamic = "force-dynamic";

// The core scoping rule for the whole portal: a client's slug is the ONLY
// way in, and every query below is filtered by that client's id. A client
// can never see another client's data, no matter how many hundreds of
// thousands of clients are in the system. Middleware already enforces the
// session-matches-slug check at the network boundary; this is the same check done
// again server-side so this page is safe even if it's ever reached by a
// path the middleware matcher doesn't cover.
export default async function ClientPortal(props: { params: Promise<{ clientSlug: string }> }) {
  const params = await props.params;
  const session = await getClientSession();
  if (!session || session.slug !== params.clientSlug) {
    redirect("/portal-login");
  }

  const client = await db.client.findUnique({
    where: { slug: params.clientSlug },
    include: {
      projects: {
        where: { archivedAt: null },
        orderBy: { updatedAt: "desc" },
        include: {
          milestones: { orderBy: { targetDate: "asc" } },
          updates: {
            where: { clientVisible: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          documents: {
            where: { clientVisible: true },
            orderBy: { createdAt: "desc" },
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
        <PortalProjectList projects={client.projects} />
      </div>
    </main>
  );
}
