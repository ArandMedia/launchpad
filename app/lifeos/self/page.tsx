import DomainWorkspace from "../domain-workspace";
import SectionHeader from "../section-header";

export default function SelfPage() {
  return <>
    <SectionHeader eyebrow="Self & purpose" title="Identity, learning & principles" description="Clarify who you are becoming, what you are learning, and the principles that constrain the systems you run." />
    <DomainWorkspace domainKey="SELF" />
  </>;
}
