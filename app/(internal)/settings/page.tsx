import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTeamSession } from "@/lib/current-session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";
import { parseUserPreferences } from "@/lib/user-preferences";
import SettingsPanel from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getTeamSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  const canUseCalendar = isLifeOSOwner(session);
  const { tab } = await searchParams;
  const initialTab = tab === "account" || (tab === "integrations" && canUseCalendar) ? tab : "general";

  return <SettingsPanel
    initialTab={initialTab}
    initialAccount={{ name: user.name, email: user.email, role: user.role }}
    initialPreferences={parseUserPreferences(user.preferences, canUseCalendar)}
    canUseCalendar={canUseCalendar}
  />;
}
