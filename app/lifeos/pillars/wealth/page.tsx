import DomainWorkspace from "../../domain-workspace";
import SectionHeader from "../../section-header";

export default function WealthPage() {
  return <>
    <SectionHeader eyebrow="Pillar" title="Wealth" description="Turn financial intent into measurable outcomes, repeatable routines, and small next actions without inventing account data or claiming a live financial connection." />
    <DomainWorkspace domainKey="WEALTH" />
  </>;
}
