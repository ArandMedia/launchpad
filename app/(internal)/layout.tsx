import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import LaunchpadBrand from "../components/LaunchpadBrand";
import { getTeamSession } from "@/lib/current-session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";

// Shared chrome for every internal (team-only) page: dashboard, clients,
// new project/client forms, and project detail all render inside this,
// so there's always a way back to the dashboard and to the other main
// sections instead of dead-ending on a form or a detail page.
export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const showLifeOS = isLifeOSOwner(await getTeamSession());
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="launchpad-header bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 xl:px-8">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 xl:gap-x-6" aria-label="Main navigation">
            <Link href="/" aria-label="LaunchPAD home" className="inline-flex min-h-11 items-center">
              <LaunchpadBrand size={34} />
            </Link>
            {showLifeOS && (
              <Link href="/lifeos" className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 hover:text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                Calendar
              </Link>
            )}
            <Link href="/?view=projects" className="text-sm text-slate-500 hover:text-slate-900">
              Projects
            </Link>
            <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-900">
              Clients
            </Link>
            {/* Plain <a>: the reference is a standalone document served by a
                route handler, not a page inside this layout. */}
            <a
              href="/reference/creative-engineering"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              Creative Engineering
            </a>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/clients/new" className="text-sm text-slate-500 hover:text-slate-900">
              + New client
            </Link>
            <Link
              href="/projects/new"
              className="bg-slate-900 text-white rounded px-3 py-1.5 text-sm font-medium"
            >
              + New project
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
