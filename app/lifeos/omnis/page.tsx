import DomainWorkspace from "../domain-workspace";
import SectionHeader from "../section-header";
import OmnisMindMap from "./omnis-mind-map";

export default function OmnisPage() {
  return <>
    <SectionHeader eyebrow="Lifelong mission" title="Operation OMNIS" description="Map the systems and milestones required to establish clean water, nutrition, healthcare, education, and safe shelter as accessible necessities for every human on Earth." />
    <OmnisMindMap />
    <details className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold text-violet-300">Strategy details & evidence</summary>
      <p className="mt-1 text-sm leading-6 text-slate-400">Open the deeper operating-state, routines, next actions, evidence, and principles that support the visual mission map.</p>
      <DomainWorkspace domainKey="OMNIS" />
    </details>
  </>;
}
