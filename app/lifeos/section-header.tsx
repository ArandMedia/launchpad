export default function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{eyebrow}</p><h2 className="mt-1 text-2xl font-bold">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
  </header>;
}
