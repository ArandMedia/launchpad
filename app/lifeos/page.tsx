import Link from "next/link";
import Workspace from "./workspace";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_COOKIE, verifySession } from "@/lib/session";
import { isLifeOSOwner } from "@/lib/lifeos-auth";

const horizons = [
  ["Lifetime", "Operation OMNIS and personal purpose"],
  ["Phases", "Multi-year strategy"],
  ["Annual", "Yearly outcomes"],
  ["13-week sprints", "Quarterly commitments"],
  ["Monthly", "Milestones within each sprint"],
  ["Weekly", "Priorities and capacity"],
  ["Daily", "Execution and reflection"],
  ["Hourly", "Time blocks"],
];

const modules = [
  ["Planning Workspace", "Map objectives from OMNIS to individual time blocks."],
  ["Daily Command Center", "Briefing, commitments, priorities, and capacity."],
  ["After Action Reviews", "Capture what happened, why, and what changes next."],
  ["Health Intelligence", "Future permission-based Apple Health integration."],
  ["AI Planning Companion", "Future contextual suggestions and decision support."],
];

export default async function LifeOSPage() {
  const token = (await cookies()).get(TEAM_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || session.kind !== "team") redirect("/login");
  // Fail closed unless this exact owner account is configured.
  if (!isLifeOSOwner(session)) redirect("/");

  return (
    <main className="lifeos-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-teal-300">LAUNCHPAD / PRIVATE LIFEOS</p>
            <h1 className="mt-2 text-3xl font-bold">Your Command Center</h1>
            <p className="mt-2 text-slate-400">Plan. Execute. Reflect. Adapt.</p>
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">Back to LaunchPAD</Link>
        </div>

        <section className="mt-5 rounded-2xl border border-teal-800 bg-slate-900 p-4 sm:p-5">
          <h2 className="text-xl font-semibold">Operation OMNIS</h2>
          <p className="mt-2 text-slate-300">Your lifetime mission informs your phases, 13-week sprints, and daily decisions. Personal goals can also stand on their own.</p>
          <p className="mt-4 text-sm text-teal-300">Private planning and AAR data is saved to your LaunchPAD database. Health connections are not enabled.</p>
        </section>

        <nav aria-label="LifeOS workspace views" className="lifeos-primary-nav mt-4 grid grid-cols-3 gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-lg">
          <a href="#timeline" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-400 px-2 py-2 text-center text-sm font-semibold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 sm:px-4 sm:text-base">Timeline / Agenda</a>
          <a href="#planning" className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 sm:px-4 sm:text-base">Planning</a>
          <a href="#aar" className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 sm:px-4 sm:text-base">Daily Review</a>
        </nav>

        <Workspace />
        <details className="mt-6 rounded-2xl border border-slate-700 bg-slate-900">
          <summary className="min-h-11 cursor-pointer touch-manipulation px-5 py-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">Planning horizons & future modules</summary>
          <div className="grid gap-6 border-t border-slate-700 p-5 md:grid-cols-2">
            <section>
              <h2 className="mb-3 text-lg font-semibold">Planning horizons</h2>
              <div className="divide-y divide-slate-800">
              {horizons.map(([name, description]) => (
                <div key={name} className="py-3">
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-slate-400">{description}</p>
                </div>
              ))}
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Future modules</h2>
              <div className="divide-y divide-slate-800">
            {modules.map(([name, description]) => (
              <div key={name} className="py-3">
                <h2 className="font-semibold">{name}</h2>
                <p className="mt-1 text-sm text-slate-400">{description}</p>
              </div>
            ))}
              </div>
            <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="block min-h-11 rounded-xl bg-teal-400 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
              Open your existing ChatGPT account ↗
            </a>
            <p className="mt-2 text-xs text-slate-400">ChatGPT opens separately. Your subscription and conversation history are not embedded or synced.</p>
          </section>
          </div>
        </details>
      </div>
    </main>
  );
}
