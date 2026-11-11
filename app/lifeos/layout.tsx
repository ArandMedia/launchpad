import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_COOKIE, verifySession } from "@/lib/session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";
import ShellNav from "./shell-nav";
import LaunchpadHeader from "../components/LaunchpadHeader";

export default async function LifeOSLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(TEAM_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || session.kind !== "team") redirect("/login");
  if (!isLifeOSOwner(session)) redirect("/");
  return <div className="min-h-screen bg-slate-950">
    <LaunchpadHeader showCalendar />
    <main className="lifeos-page text-slate-100">
      <div className="mx-auto max-w-[1440px]">
        <header className="lifeos-shell-header flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold tracking-[0.18em] text-violet-300">PRIVATE WORKSPACE</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Calendar</h1></div>
          <p className="text-sm text-slate-400">Plan · Execute · Reflect · Adapt</p>
        </header>
        <div className="lifeos-shell-grid mt-4"><ShellNav /><div className="lifeos-shell-main min-w-0">{children}</div></div>
      </div>
    </main>
  </div>;
}
