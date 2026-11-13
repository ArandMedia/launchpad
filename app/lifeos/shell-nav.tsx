"use client";

import Link from "@/app/components/StableLink";
import { usePathname } from "next/navigation";

const links = [
  ["Today", "/lifeos/today", "Now"],
  ["Decision Matrix", "/lifeos/decision-matrix", "Prioritize today"],
  ["Timeline", "/lifeos/timeline", "Life → Hour"],
  ["Pillars", "/lifeos/pillars", "Health · Wealth · Relationships"],
  ["Self & Purpose", "/lifeos/self", "Identity · Learning · Principles"],
  ["ArandMedia", "/lifeos/arandmedia", "Portfolio alignment"],
  ["Operation OMNIS", "/lifeos/omnis", "Mission · Strategy"],
  ["Journal & Notes", "/lifeos/journal", "Pencil · Search"],
  ["Insights", "/lifeos/insights", "Reviews · Evidence"],
  ["Settings", "/settings", "Account · Integrations"],
] as const;

export default function ShellNav() {
  const pathname = usePathname();
  return <nav className="lifeos-shell-nav" aria-label="Calendar primary navigation">
    {links.map(([label, href, detail]) => {
      const active = pathname === href || (href === "/lifeos/pillars" && pathname.startsWith("/lifeos/pillars/"));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`lifeos-shell-link ${active ? "lifeos-shell-link--active" : ""}`}>
        <span>{label}</span><small>{detail}</small>
      </Link>;
    })}
  </nav>;
}
