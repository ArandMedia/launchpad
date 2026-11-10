import { DomainSummary } from "../core-summary";
import SectionHeader from "../section-header";

export default function PillarsPage() {
  return <>
    <SectionHeader eyebrow="Core pillars" title="Health, wealth & relationships" description="Each pillar uses the same closed loop: establish reality, define the desired state, expose the gap, run a system, choose next actions, and measure evidence." />
    <div className="mt-5"><DomainSummary domains={["HEALTH", "WEALTH", "RELATIONSHIPS"]} /></div>
  </>;
}
