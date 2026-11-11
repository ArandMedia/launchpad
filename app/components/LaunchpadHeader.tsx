import Link from "next/link";
import LaunchpadBrand from "./LaunchpadBrand";
import LogoutButton from "./LogoutButton";

const navLink = "inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-semibold text-slate-600 transition hover:bg-violet-50 hover:text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600";

export default function LaunchpadHeader({ showCalendar }: { showCalendar: boolean }) {
  return <header className="launchpad-header sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur">
    <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 xl:px-8">
      <nav className="flex flex-wrap items-center gap-1 sm:gap-2" aria-label="Main navigation">
        <Link href="/" aria-label="LaunchPAD home" className="mr-1 inline-flex min-h-11 items-center rounded-lg pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
          <LaunchpadBrand size={34} />
        </Link>
        {showCalendar && <Link href="/lifeos" className={navLink}>Calendar</Link>}
        <Link href="/?view=projects" className={navLink}>Projects</Link>
        <Link href="/clients" className={navLink}>Clients</Link>
        <a href="/reference/creative-engineering" className={navLink}>Creative Engineering</a>
        <Link href="/settings" className={navLink}>Settings</Link>
      </nav>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/clients/new" className="lp-button-secondary">+ Client</Link>
        <Link href="/projects/new" className="lp-button-primary">+ Project</Link>
        <LogoutButton />
      </div>
    </div>
  </header>;
}
