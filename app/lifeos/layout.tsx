import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_COOKIE, verifySession } from "@/lib/session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";
import ShellNav from "./shell-nav";
import LaunchpadBrand from "../components/LaunchpadBrand";

export default async function LifeOSLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(TEAM_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || session.kind !== "team") redirect("/login");
  if (!isLifeOSOwner(session)) redirect("/");
  return <main className="lifeos-page min-h-screen bg-slate-950 text-slate-100">
    <div className="mx-auto max-w-[1440px]">
      <header className="lifeos-shell-header flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold tracking-[0.18em] text-violet-300">LAUNCHPAD / PRIVATE CALENDAR</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Calendar</h1></div>
        <div className="flex items-center gap-2"><span className="hidden text-sm text-slate-400 sm:inline">Plan · Execute · Reflect · Adapt</span><Link href="/?view=projects" aria-label="Open LaunchPAD projects" className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"><LaunchpadBrand size={30} wordmarkClassName="text-slate-100" /></Link></div>
      </header>
      <div className="lifeos-shell-grid mt-4"><ShellNav /><div className="lifeos-shell-main min-w-0">{children}</div></div>
    </div>
  </main>;
}
