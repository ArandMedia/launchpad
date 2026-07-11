import { db } from "@/lib/db";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  DISCOVERY: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  REVIEW: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
  COMPLETE: "bg-green-100 text-green-700",
};

// Server component — fetches first page directly. The client-side
// dashboard can later swap to SWR + the /api/projects cursor endpoint
// for infinite scroll once volume grows.
export default async function InternalDashboard() {
  const projects = await db.project.findMany({
    take: 50,
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { name: true, companyName: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
  });

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">LaunchPAD</h1>
        <div className="flex items-center gap-4">
          <Link href="/clients/new" className="text-sm text-slate-500 hover:text-slate-900">
            + New client
          </Link>
          <Link
            href="/projects/new"
            className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm font-medium"
          >
            + New project
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="grid gap-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-4 hover:border-slate-400 transition-colors bg-white"
          >
            <div>
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-sm text-slate-500">
                {p.client.companyName || p.client.name} · {p._count.tasks} tasks ·{" "}
                {p._count.milestones} milestones
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[p.status]}`}
            >
              {p.status.replace("_", " ")}
            </span>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            No projects yet.{" "}
            <Link href="/projects/new" className="underline">
              Create your first one →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
