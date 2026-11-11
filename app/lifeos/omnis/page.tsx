import DomainWorkspace from "../domain-workspace";
import SectionHeader from "../section-header";

export default function OmnisPage() {
  return <>
    <SectionHeader eyebrow="Mission" title="Operation OMNIS" description="Maintain the mission, strategic gaps, active systems, and evidence that connect the whole Calendar. Existing unclassified goals remain here for compatibility." />
    <DomainWorkspace domainKey="OMNIS" />
  </>;
}
