import { db } from "@/lib/db";
import Link from "next/link";
import ClientRowActions from "./ClientRowActions";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { archived?: string };
}) {
  const showArchived = searchParams.archived === "1";

  const clients = await db.client.findMany({
    where: showArchived ? { archivedAt: { not: null } } : { archivedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {showArchived ? "Archived clients" : "Clients"}
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href={showArchived ? "/clients" : "/clients?archived=1"}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            {showArchived ? "← Back to active clients" : "View archived →"}
          </Link>
          <Link
            href="/clients/new"
            className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm font-medium"
          >
            + New client
          </Link>
        </div>
      </div>

      <div className="grid gap-3">
        {clients.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-4 bg-white"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{c.companyName || c.name}</span>
                {c.archivedAt && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    Archived
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">
                {c.email} · {c._count.projects} project{c._count.projects === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <Link
                href={`/clients/${c.id}/edit`}
                className="text-sm text-slate-500 hover:underline"
              >
                Edit
              </Link>
              <a
                href={`https://portal.arandmedia.com/${c.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View portal →
              </a>
              <ClientRowActions
                clientId={c.id}
                clientName={c.companyName || c.name}
                archived={!!c.archivedAt}
                projectCount={c._count.projects}
              />
            </div>
          </div>
        ))}

        {clients.length === 0 && !showArchived && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            No clients yet.{" "}
            <Link href="/clients/new" className="underline">
              Add your first one →
            </Link>
          </div>
        )}

        {clients.length === 0 && showArchived && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            No archived clients.
          </div>
        )}
      </div>
    </main>
  );
}
