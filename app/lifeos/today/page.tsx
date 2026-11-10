import { TodayContext } from "../core-summary";
import SectionHeader from "../section-header";
import Workspace from "../workspace";

export default function TodayPage() {
  return <>
    <SectionHeader eyebrow="Execute" title="Today" description="Run the day from one agenda: priorities, linked context, and editable time blocks. The calendar remains the source of truth for execution." />
    <TodayContext />
    <Workspace mode="today" />
  </>;
}
