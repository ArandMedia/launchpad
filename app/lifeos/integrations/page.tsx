import SectionHeader from "../section-header";
import CalendarIntegrations from "./calendar-integrations";

export default function IntegrationsPage() {
  return <>
    <SectionHeader eyebrow="Connect" title="Integrations" description="Subscribe to public calendars without giving LaunchPAD permission to edit the source. Label and color each feed so schedules stay easy to scan." />
    <CalendarIntegrations />
  </>;
}
