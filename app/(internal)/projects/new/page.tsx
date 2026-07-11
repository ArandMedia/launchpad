"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Client = { id: string; name: string; companyName: string | null };

export default function NewProjectPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [status, setStatus] = useState("DISCOVERY");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        setClients(data.clients || []);
        if (data.clients?.[0]) setClientId(data.clients[0].id);
      })
      .finally(() => setClientsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        clientId,
        description: description || undefined,
        problem: problem || undefined,
        solution: solution || undefined,
        desiredOutcome: desiredOutcome || undefined,
        status,
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push(`/projects/${data.project.id}`);
  }

  if (!clientsLoading && clients.length === 0) {
    return (
      <main className="p-8 max-w-lg mx-auto">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-700">
          ← Back to projects
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mb-2 mt-2">New project</h1>
        <p className="text-sm text-slate-500 mb-4">
          You need a client before you can create a project.
        </p>
        <Link
          href="/clients/new"
          className="inline-block bg-slate-900 text-white rounded px-3 py-2 text-sm font-medium"
        >
          Create a client first →
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-700">
        ← Back to projects
      </Link>
      <h1 className="text-xl font-semibold text-slate-900 mb-6 mt-2">New project</h1>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName || c.name}
            </option>
          ))}
        </select>
        <textarea
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="border border-slate-200 rounded-lg p-3 grid gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Scope (optional, shown to the client too)
          </p>
          <label className="text-xs text-slate-500">
            Problem
            <textarea
              className="border border-slate-300 rounded px-3 py-2 text-sm w-full mt-1"
              placeholder="What problem are we solving?"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={2}
            />
          </label>
          <label className="text-xs text-slate-500">
            Solution
            <textarea
              className="border border-slate-300 rounded px-3 py-2 text-sm w-full mt-1"
              placeholder="What are we building?"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={2}
            />
          </label>
          <label className="text-xs text-slate-500">
            Desired outcome
            <textarea
              className="border border-slate-300 rounded px-3 py-2 text-sm w-full mt-1"
              placeholder="What does done look like?"
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
              rows={2}
            />
          </label>
        </div>

        <label className="text-xs text-slate-500">
          Status
          <select
            className="border border-slate-300 rounded px-3 py-2 text-sm w-full mt-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="DISCOVERY">Discovery</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="REVIEW">Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500">
            Start date
            <input
              type="date"
              className="border border-slate-300 rounded px-3 py-2 text-sm w-full mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Target date
            <input
              type="date"
              className="border border-slate-300 rounded px-3 py-2 text-sm w-full mt-1"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || clientsLoading}
          className="bg-slate-900 text-white rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </form>
    </main>
  );
}
