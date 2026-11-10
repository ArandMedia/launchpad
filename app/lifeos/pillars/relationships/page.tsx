import DomainWorkspace from "../../domain-workspace";
import SectionHeader from "../../section-header";

export default function RelationshipsPage() {
  return <>
    <SectionHeader eyebrow="Pillar" title="Relationships" description="Make care operational through explicit commitments, routines, and evidence while keeping personal notes inside the owner boundary." />
    <DomainWorkspace domainKey="RELATIONSHIPS" />
  </>;
}
