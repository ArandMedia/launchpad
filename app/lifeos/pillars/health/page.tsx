import DomainWorkspace from "../../domain-workspace";
import SectionHeader from "../../section-header";

export default function HealthPage() {
  return <>
    <SectionHeader eyebrow="Pillar" title="Health" description="Track health intentionally with manual evidence today. Sensitive measurements are encrypted separately; Apple Health, Oura, and Hume remain consent-gated adapters until authorized." />
    <DomainWorkspace domainKey="HEALTH" />
  </>;
}
