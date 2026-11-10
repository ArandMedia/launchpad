import SectionHeader from "../section-header";
import Workspace from "../workspace";

export default function TimelinePage() {
  return <>
    <SectionHeader eyebrow="Plan" title="Life-to-hour timeline" description="Move from long-horizon outcomes to the quarter, week, day, and hour without losing the existing objective hierarchy or calendar." />
    <Workspace mode="timeline" />
  </>;
}
