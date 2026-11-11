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
    <main className="lp-page">
      <div className="lp-page-header">
        <div>
          <p className="lp-eyebrow">Relationships</p>
          <h1 className="lp-title">{showArchived ? "Archived clients" : "Clients"}</h1>
          <p className="lp-subtitle">Manage client details, portal access, and the projects connected to each relationship.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={showArchived ? "/clients" : "/clients?archived=1"}
            className="lp-button-secondary"
          >
            {showArchived ? "← Back to active clients" : "View archived"}
          </Link>
          <Link
            href="/clients/new"
            className="lp-button-primary"
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
