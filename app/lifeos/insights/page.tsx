import { ReviewCycles } from "../core-summary";
import SectionHeader from "../section-header";
import Workspace from "../workspace";

export default function InsightsPage() {
  return <>
    <SectionHeader eyebrow="Reflect & adapt" title="Insights" description="Use daily after-action reviews and deliberate weekly, monthly, or quarterly decisions to close the loop between evidence and the next system change." />
    <Workspace mode="reviews" />
    <ReviewCycles />
  </>;
}
