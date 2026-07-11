import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Clients</h1>
        <Link
          href="/clients/new"
          className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm font-medium"
        >
          + New client
        </Link>
      </div>

      <div className="grid gap-3">
        {clients.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-4 bg-white"
          >
            <div>
              <div className="font-medium text-slate-900">{c.companyName || c.name}</div>
              <div className="text-sm text-slate-500">
                {c.email} · {c._count.projects} project{c._count.projects === 1 ? "" : "s"}
              </div>
            </div>
            <a
              href={`https://portal.arandmedia.com/${c.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View portal →
            </a>
          </div>
        ))}

        {clients.length === 0 && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            No clients yet.{" "}
            <Link href="/clients/new" className="underline">
              Add your first one →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
