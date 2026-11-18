"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "@/app/components/StableLink";
import FitnessResources from "./fitness-resources";
import {
  BUILT_IN_PILLAR_RESOURCES,
  PILLAR_RESOURCE_CATEGORIES,
  RESOURCE_PILLARS,
  RESOURCE_TYPES,
  type PillarResource,
  type ResourcePillar,
  type ResourceType,
} from "@/lib/pillar-resources";

type Draft = {
  pillarKey: ResourcePillar;
  category: string;
  resourceType: ResourceType;
  title: string;
  description: string;
  url: string;
  favorite: boolean;
};

const pillarDetails: Record<ResourcePillar, { label: string; description: string; accent: string }> = {
  HEALTH: { label: "Health", description: "Nutrition, movement, recovery, mental health, and prevention", accent: "border-emerald-400/60 bg-emerald-950/25 text-emerald-200" },
  WEALTH: { label: "Wealth", description: "Cash flow, investing, business, career, credit, and protection", accent: "border-amber-400/60 bg-amber-950/25 text-amber-200" },
  RELATIONSHIPS: { label: "Relationships", description: "Communication, family, community, boundaries, and shared experiences", accent: "border-sky-400/60 bg-sky-950/25 text-sky-200" },
};

const typeLabels: Record<ResourceType, string> = {
  LINK: "Link",
  TOOL: "Tool",
  VIDEO: "Video",
  GUIDE: "Guide",
  NOTE: "Saved note",
};

function blankDraft(pillarKey: ResourcePillar): Draft {
  return { pillarKey, category: PILLAR_RESOURCE_CATEGORIES[pillarKey][0], resourceType: "LINK", title: "", description: "", url: "", favorite: false };
}

export default function PillarResourcesWorkspace() {
  const [customResources, setCustomResources] = useState<PillarResource[]>([]);
  const [activePillar, setActivePillar] = useState<ResourcePillar>("HEALTH");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ResourceType>("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft("HEALTH"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/lifeos/pillar-resources", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load your pillar resources");
    const data = await response.json();
    setCustomResources(data.resources ?? []);
  }

  useEffect(() => {
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load your pillar resources"));
  }, []);

  const resources = useMemo(() => [...customResources, ...BUILT_IN_PILLAR_RESOURCES], [customResources]);
  const pillarResources = useMemo(() => resources.filter((resource) => resource.pillarKey === activePillar), [activePillar, resources]);
  const categories = useMemo(() => {
    const ordered = [...PILLAR_RESOURCE_CATEGORIES[activePillar]];
    for (const resource of pillarResources) if (!ordered.includes(resource.category)) ordered.push(resource.category);
    return ordered;
  }, [activePillar, pillarResources]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pillarResources.filter((resource) => {
      if (categoryFilter !== "ALL" && resource.category !== categoryFilter) return false;
      if (typeFilter !== "ALL" && resource.resourceType !== typeFilter) return false;
      if (favoritesOnly && !resource.favorite) return false;
      return !query || resource.title.toLowerCase().includes(query) || resource.description.toLowerCase().includes(query) || resource.category.toLowerCase().includes(query);
    }).sort((left, right) => Number(right.favorite) - Number(left.favorite) || Number(left.builtIn) - Number(right.builtIn) || left.title.localeCompare(right.title));
  }, [categoryFilter, favoritesOnly, pillarResources, search, typeFilter]);
  const visibleCategories = categories.filter((category) => visible.some((resource) => resource.category === category));

  function selectPillar(pillar: ResourcePillar) {
    setActivePillar(pillar);
    setCategoryFilter("ALL");
    setSearch("");
    if (!editingId) setDraft(blankDraft(pillar));
  }

  function beginNew() {
    setEditingId(null);
    setDraft(blankDraft(activePillar));
    setEditorOpen(true);
    setError("");
    setNotice("");
    requestAnimationFrame(() => document.getElementById("resource-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function beginEdit(resource: PillarResource) {
    if (resource.builtIn) return;
    setEditingId(resource.id);
    setDraft({ pillarKey: resource.pillarKey, category: resource.category, resourceType: resource.resourceType, title: resource.title, description: resource.description, url: resource.url, favorite: resource.favorite });
    setEditorOpen(true);
    setError("");
    setNotice("");
    requestAnimationFrame(() => document.getElementById("resource-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/lifeos/pillar-resources", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), ...draft }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Unable to save the resource");
      await load();
      setActivePillar(draft.pillarKey);
      setEditorOpen(false);
      setEditingId(null);
      setNotice(editingId ? "Resource updated" : "Resource added");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the resource");
    } finally {
      setBusy(false);
    }
  }

  async function updateFavorite(resource: PillarResource) {
    if (resource.builtIn) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lifeos/pillar-resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resource.id, pillarKey: resource.pillarKey, category: resource.category, resourceType: resource.resourceType, title: resource.title, description: resource.description, url: resource.url, favorite: !resource.favorite }),
      });
      if (!response.ok) throw new Error("Unable to update the favorite");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the favorite");
    } finally {
      setBusy(false);
    }
  }

  async function remove(resource: PillarResource) {
    if (resource.builtIn || !confirm(`Remove “${resource.title}” from Pillar Resources?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lifeos/pillar-resources", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: resource.id }) });
      if (!response.ok) throw new Error("Unable to remove the resource");
      await load();
      setNotice("Resource removed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove the resource");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-base text-slate-100 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/30";

  return <div className="mt-5 space-y-5">
    {(error || notice) && <p role={error ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${error ? "border-red-500/60 bg-red-950/30 text-red-200" : "border-emerald-500/50 bg-emerald-950/25 text-emerald-200"}`}>{error || notice}</p>}

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-3">
        {RESOURCE_PILLARS.map((pillar) => {
          const detail = pillarDetails[pillar];
          const active = pillar === activePillar;
          const count = resources.filter((resource) => resource.pillarKey === pillar).length;
          return <button key={pillar} type="button" onClick={() => selectPillar(pillar)} aria-pressed={active} className={`min-h-24 rounded-xl border p-4 text-left transition ${active ? detail.accent + " ring-2 ring-violet-300/20" : "border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-500"}`}>
            <span className="flex items-center justify-between gap-3"><strong className="text-lg">{detail.label}</strong><span className="text-sm opacity-75">{count}</span></span>
            <span className="mt-1 block text-xs leading-5 opacity-75">{detail.description}</span>
          </button>;
        })}
      </div>
    </section>

    {activePillar === "HEALTH" && <FitnessResources />}

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="resource-library-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{pillarDetails[activePillar].label}</p><h3 id="resource-library-heading" className="mt-1 text-xl font-semibold">Resource library</h3><p className="mt-1 text-sm leading-6 text-slate-400">External links open separately, so this Calendar stays open and ready when you return.</p></div>
        <button type="button" onClick={beginNew} className="min-h-11 rounded-lg bg-violet-400 px-4 text-sm font-semibold text-slate-950 hover:bg-violet-300">+ Add resource</button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_11rem_auto]">
        <label className="text-sm font-medium text-slate-300">Search<input value={search} onChange={(event) => setSearch(event.target.value)} className={input} placeholder="Title, topic, or description…" /></label>
        <label className="text-sm font-medium text-slate-300">Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={input}><option value="ALL">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-300">Type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className={input}><option value="ALL">All types</option>{RESOURCE_TYPES.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-300"><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} className="h-4 w-4 accent-violet-400" /> Favorites</label>
      </div>

      <div className="mt-5 space-y-6">
        {visibleCategories.map((category) => <section key={category} aria-labelledby={`category-${category.replaceAll(" ", "-")}`}>
          <div className="flex items-center gap-3"><h4 id={`category-${category.replaceAll(" ", "-")}`} className="font-semibold text-slate-200">{category}</h4><span className="h-px flex-1 bg-slate-800" /></div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {visible.filter((resource) => resource.category === category).map((resource) => <article key={resource.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full border border-slate-700 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400">{typeLabels[resource.resourceType]}</span>{resource.builtIn && <span className="rounded-full border border-violet-700 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-violet-300">Curated starter</span>}</div><h5 className="mt-3 break-words font-semibold text-slate-100">{resource.title}</h5></div>
                {!resource.builtIn && <button type="button" disabled={busy} onClick={() => void updateFavorite(resource)} aria-label={resource.favorite ? `Remove ${resource.title} from favorites` : `Add ${resource.title} to favorites`} className={`shrink-0 rounded-lg px-2 py-1 text-xl ${resource.favorite ? "text-amber-300" : "text-slate-600 hover:text-amber-300"}`}>{resource.favorite ? "★" : "☆"}</button>}
              </div>
              {resource.description && <p className="mt-3 text-sm leading-6 text-slate-400">{resource.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {resource.url && <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-violet-400 px-4 text-sm font-semibold text-slate-950 hover:bg-violet-300">Open separately ↗</a>}
                {!resource.builtIn && <><button type="button" onClick={() => beginEdit(resource)} className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-300 hover:bg-slate-800">Edit</button><button type="button" disabled={busy} onClick={() => void remove(resource)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50">Remove</button></>}
                {!resource.url && <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved inside Calendar</span>}
              </div>
            </article>)}
          </div>
        </section>)}
        {!visible.length && <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No resources match these filters. Clear them or add a resource for this pillar.</p>}
      </div>
    </section>

    {editorOpen && <section id="resource-editor" className="scroll-mt-8 rounded-2xl border border-violet-600 bg-slate-900 p-4 sm:p-5" aria-labelledby="resource-editor-heading">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Personal library</p><h3 id="resource-editor-heading" className="mt-1 text-xl font-semibold">{editingId ? "Edit resource" : "Add a resource"}</h3></div><button type="button" onClick={() => { setEditorOpen(false); setEditingId(null); }} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-300">Close</button></div>
      <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-300">Pillar<select value={draft.pillarKey} onChange={(event) => { const pillarKey = event.target.value as ResourcePillar; setDraft({ ...draft, pillarKey, category: PILLAR_RESOURCE_CATEGORIES[pillarKey][0] }); }} className={input}>{RESOURCE_PILLARS.map((pillar) => <option key={pillar} value={pillar}>{pillarDetails[pillar].label}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-300">Category<input required maxLength={80} list={`resource-categories-${draft.pillarKey}`} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={input} /><datalist id={`resource-categories-${draft.pillarKey}`}>{PILLAR_RESOURCE_CATEGORIES[draft.pillarKey].map((category) => <option key={category} value={category} />)}</datalist></label>
        <label className="text-sm font-medium text-slate-300">Type<select value={draft.resourceType} onChange={(event) => setDraft({ ...draft, resourceType: event.target.value as ResourceType })} className={input}>{RESOURCE_TYPES.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-300">Title<input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={input} /></label>
        <label className="text-sm font-medium text-slate-300 md:col-span-2">Link <span className="font-normal text-slate-500">(optional for notes or information stored here)</span><input type="url" maxLength={2000} inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} className={input} /></label>
        <label className="text-sm font-medium text-slate-300 md:col-span-2">Why it is useful / notes<textarea rows={4} maxLength={5000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={input} /></label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-300"><input type="checkbox" checked={draft.favorite} onChange={(event) => setDraft({ ...draft, favorite: event.target.checked })} className="h-4 w-4 accent-violet-400" /> Keep near the top</label>
        <div className="flex flex-wrap justify-end gap-2 md:col-span-2"><button type="button" onClick={() => { setEditorOpen(false); setEditingId(null); }} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-300">Cancel</button><button disabled={busy} className="min-h-11 rounded-lg bg-violet-400 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : editingId ? "Save changes" : "Add resource"}</button></div>
      </form>
    </section>}

    <div className="flex justify-end"><Link href="/lifeos/today" className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-violet-300 hover:bg-slate-900">← Return to Calendar</Link></div>
  </div>;
}
