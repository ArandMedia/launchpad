import Link from "next/link";
import { db } from "@/lib/db";
import DomainWorkspace from "../domain-workspace";
import SectionHeader from "../section-header";

export const dynamic = "force-dynamic";

export default async function ArandMediaPage() {
  const [clientCount, projects] = await Promise.all([
    db.client.count({ where: { archivedAt: null } }),
    db.project.findMany({ where: { archivedAt: null }, include: { client: { select: { name: true, companyName: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
  ]);
  const active = projects.filter((project) => project.status !== "COMPLETE");
  return <>
    <SectionHeader eyebrow="Portfolio" title="ArandMedia" description="Align the business operating system with the real LaunchPAD portfolio. Client and project facts remain in their existing records; this workspace adds strategic context without duplicating them." />
    <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">LaunchPAD portfolio</h3><p className="mt-1 text-sm text-slate-400">{clientCount} active client{clientCount === 1 ? "" : "s"} · {active.length} active project{active.length === 1 ? "" : "s"} in the latest set</p></div><Link href="/" className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800">Open LaunchPAD</Link></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{active.length ? active.map((project) => <Link href={`/projects/${project.id}`} key={project.id} className="min-h-20 rounded-lg border border-slate-800 p-3 hover:bg-slate-800"><span className="font-semibold">{project.name}</span><span className="mt-1 block text-sm text-slate-400">{project.client.companyName || project.client.name} · {project.status.replaceAll("_", " ").toLowerCase()}</span></Link>) : <p className="md:col-span-2 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">No active projects in the latest portfolio set.</p>}</div>
    </section>
    <DomainWorkspace domainKey="ARANDMEDIA" />
  </>;
}
