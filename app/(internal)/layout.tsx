import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

// Shared chrome for every internal (team-only) page: dashboard, clients,
// new project/client forms, and project detail all render inside this,
// so there's always a way back to the dashboard and to the other main
// sections instead of dead-ending on a form or a detail page.
export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-slate-900">
              LaunchPAD
            </Link>
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
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
          <div className="flex items-center gap-4">
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
