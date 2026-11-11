import DomainWorkspace from "../domain-workspace";
import SectionHeader from "../section-header";

export default function SelfPage() {
  return <>
    <SectionHeader eyebrow="Self & purpose" title="A living map of who I am" description="Keep an honest, changing reflection of your identity, values, convictions, strengths, shortcomings, and the person you are becoming—then use it to make better decisions." />
    <DomainWorkspace domainKey="SELF" />
  </>;
}
