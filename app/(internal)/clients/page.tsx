import { db } from "@/lib/db";
import Link from "next/link";
import ClientsList from "./ClientsList";

export const dynamic = "force-dynamic";

export default async function ClientsPage(
  props: {
    searchParams: Promise<{ archived?: string }>;
  }
) {
  const searchParams = await props.searchParams;
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

      <ClientsList
        clients={clients}
        emptyLabel={
          showArchived ? (
            "No archived clients."
          ) : (
            <>
              No clients yet.{" "}
              <Link href="/clients/new" className="underline">
                Add your first one →
              </Link>
            </>
          )
        }
      />
    </main>
  );
}
