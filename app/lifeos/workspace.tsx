"use client";

import { useEffect, useState, type FormEvent } from "react";

type Goal = { id:string; title:string; horizon:string; parentId:string|null; done:boolean };
type Review = { id:string; date:string; intended:string; actual:string; learned:string; next:string };
const horizons = ["LIFETIME","PHASE","YEAR","SPRINT","MONTH","WEEK","DAY","HOUR"];
export default function Workspace() {
  const [goals,setGoals] = useState<Goal[]>([]);
  const [reviews,setReviews] = useState<Review[]>([]);
  const [horizon,setHorizon] = useState("SPRINT");
  const [title,setTitle] = useState("");
  const [parentId,setParentId] = useState("");
  const [date,setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [intended,setIntended] = useState("");
  const [actual,setActual] = useState("");
  const [learned,setLearned] = useState("");
  const [next,setNext] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  async function refresh() {
    const res = await fetch("/api/lifeos", { cache:"no-store" });
    if (!res.ok) throw new Error("Unable to load your private workspace");
    const data = await res.json();
    setGoals(data.goals); setReviews(data.reviews);
  }
  useEffect(() => { refresh().catch(e=>setError(e.message)); },[]);
  async function submit(body:object) {
    setBusy(true);setError("");
    try {
      const res = await fetch("/api/lifeos", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || "Unable to save");
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to save"); }
    finally { setBusy(false); }
  }
  async function addGoal(e:FormEvent) {e.preventDefault(); await submit({kind:"goal",title,horizon,parentId:parentId||null});setTitle("");}
  async function addReview(e:FormEvent) {e.preventDefault();await submit({kind:"review",date,intended,actual,learned,next});}
  async function toggle(goal:Goal) {
    setBusy(true);setError("");
    try {
      const res=await fetch("/api/lifeos",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:goal.id,done:!goal.done})});
      if(!res.ok)throw new Error("Unable to update goal");
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Unable to update");}
    finally{setBusy(false);}
  }
  const input="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-slate-100";
  return <div className="mt-8 grid gap-6 lg:grid-cols-2">
    {error&&<p role="alert" className="rounded-lg border border-red-500 p-3 text-red-300 lg:col-span-2">{error}</p>}
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <h2 className="text-xl font-semibold">Planning workspace</h2>
      <p className="mt-2 text-sm text-slate-400">Create outcomes across time horizons and connect them to a parent goal.</p>
      <form onSubmit={addGoal} className="mt-4 space-y-3">
        <label className="block">Objective<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className={input}/></label>
        <label className="block">Horizon<select value={horizon} onChange={e=>setHorizon(e.target.value)} className={input}>{horizons.map(h=><option key={h} value={h}>{h==="SPRINT"?"13-week sprint":h.toLowerCase()}</option>)}</select></label>
        <label className="block">Parent objective<select value={parentId} onChange={e=>setParentId(e.target.value)} className={input}><option value="">None</option>{goals.filter(g=>!g.done).map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
        <button disabled={busy} className="rounded-lg bg-teal-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">Save objective</button>
      </form>
      <div className="mt-6 space-y-3">{goals.map(g=><div key={g.id} className="rounded-lg border border-slate-700 p-3"><div className="flex items-center justify-between gap-2"><div><p className={g.done?"line-through text-slate-400":"font-semibold"}>{g.title}</p><p className="text-xs text-slate-400">{g.horizon} {g.parentId?"· Linked to parent":""}</p></div><button disabled={busy} onClick={()=>toggle(g)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{g.done?"Reopen":"Complete"}</button></div></div>)}</div>
    </section>
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <h2 className="text-xl font-semibold">Daily After Action Review</h2>
      <form onSubmit={addReview} className="mt-4 space-y-3">
        <label className="block">Date<input type="date" required value={date} onChange={e=>setDate(e.target.value)} className={input}/></label>
        {([["What was intended?",intended,setIntended],["What actually happened?",actual,setActual],["What did you learn?",learned,setLearned],["What changes next?",next,setNext]] as const).map(([label,value,set])=><label key={label} className="block">{label}<textarea maxLength={4000} value={value} onChange={e=>set(e.target.value)} className={input} rows={3}/></label>)}
        <button disabled={busy} className="rounded-lg bg-teal-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">Save AAR</button>
      </form>
      <h3 className="mt-6 font-semibold">Recent reviews</h3>
      <div className="mt-2 space-y-2">{reviews.map(r=><div key={r.id} className="rounded-lg border border-slate-700 p-3"><p className="font-semibold">{r.date.slice(0,10)}</p><p className="mt-1 text-sm text-slate-300">{r.learned||r.actual||"Review saved"}</p></div>)}</div>
    </section>
  </div>;
}
