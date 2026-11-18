import Link from "@/app/components/StableLink";
import SectionHeader from "../section-header";
import PillarResourcesWorkspace from "./pillar-resources-workspace";

export default function PillarResourcesPage() {
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1"><SectionHeader eyebrow="Practical support" title="Pillar Resources" description="Keep trusted tools, guides, videos, notes, and links organized around Health, Wealth, and Relationships." /></div>
      <Link href="/lifeos/today" className="inline-flex min-h-11 items-center rounded-lg border border-violet-400/70 px-4 text-sm font-semibold text-violet-200 hover:bg-violet-950/50">← Back to Calendar</Link>
    </div>
    <PillarResourcesWorkspace />
  </>;
}
