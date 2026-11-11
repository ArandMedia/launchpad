import { getTeamSession } from "@/lib/current-session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";
import LaunchpadHeader from "../components/LaunchpadHeader";

// Shared chrome for every internal (team-only) page: dashboard, clients,
// new project/client forms, and project detail all render inside this,
// so there's always a way back to the dashboard and to the other main
// sections instead of dead-ending on a form or a detail page.
export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const showLifeOS = isLifeOSOwner(await getTeamSession());
  return (
    <div className="min-h-screen bg-slate-50">
      <LaunchpadHeader showCalendar={showLifeOS} />
      {children}
    </div>
  );
}
