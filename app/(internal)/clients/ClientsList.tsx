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
          className="lp-input mb-4"
        />
      )}

      <div className="grid gap-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="lp-card flex flex-wrap items-center justify-between gap-4 transition hover:border-violet-200 hover:shadow-md"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{c.companyName || c.name}</span>
                {c.archivedAt && (
                  <span className="lp-badge border-slate-200 bg-slate-100 text-slate-600">
                    Archived
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">
                {c.email} · {c._count.projects} project{c._count.projects === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/clients/${c.id}/edit`} className="lp-button-ghost">
                Edit
              </Link>
              <a
                href={`https://portal.arandmedia.com/${c.slug}`}
                target="_blank"
                rel="noreferrer"
                className="lp-button-secondary"
              >
                View portal
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
          <div className="lp-empty">
            {emptyLabel}
          </div>
        )}

        {clients.length > 0 && filtered.length === 0 && (
          <div className="lp-empty">
            No clients match "{query}".
          </div>
        )}
      </div>
    </>
  );
}
