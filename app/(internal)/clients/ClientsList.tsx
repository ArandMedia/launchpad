"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ClientRowActions from "./ClientRowActions";

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  slug: string;
  archivedAt: Date | null;
  _count: { projects: number };
};

export default function ClientsList({
  clients,
  emptyLabel,
}: {
  clients: Client[];
  emptyLabel: React.ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.companyName, c.email]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    );
  }, [clients, query]);

  return (
    <>
      {clients.length > 4 && (
        <input
          type="search"
          placeholder="Search clients by name, company, or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm mb-4 w-full bg-white"
        />
      )}

      <div className="grid gap-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-4 bg-white"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{c.companyName || c.name}</span>
                {c.archivedAt && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    Archived
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">
                {c.email} · {c._count.projects} project{c._count.projects === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <Link href={`/clients/${c.id}/edit`} className="text-sm text-slate-500 hover:underline">
                Edit
              </Link>
              <a
                href={`https://portal.arandmedia.com/${c.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View portal →
              </a>
              <ClientRowActions
                clientId={c.id}
                clientName={c.companyName || c.name}
                archived={!!c.archivedAt}
                projectCount={c._count.projects}
              />
            </div>
          </div>
        ))}

        {clients.length === 0 && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            {emptyLabel}
          </div>
        )}

        {clients.length > 0 && filtered.length === 0 && (
          <div className="text-slate-400 text-sm py-12 text-center border border-dashed border-slate-200 rounded-lg">
            No clients match "{query}".
          </div>
        )}
      </div>
    </>
  );
}
