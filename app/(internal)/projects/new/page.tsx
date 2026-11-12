"use client";

import { useEffect, useState } from "react";
import Link from "@/app/components/StableLink";
import { clientApi, clientErrorMessage } from "@/lib/client-api";

type Client = { id: string; name: string; companyName: string | null };

export default function NewProjectPage() {
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
    clientApi<{ clients: Client[] }>("/api/clients")
      .then((data) => {
        setClients(data.clients || []);
        if (data.clients?.[0]) setClientId(data.clients[0].id);
      })
      .catch((caught) => setError(clientErrorMessage(caught)))
      .finally(() => setClientsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await clientApi<{ project: { id: string } }>("/api/projects", {
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
      window.location.assign(`/projects/${data.project.id}`);
    } catch (caught) {
      setError(clientErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  if (!clientsLoading && clients.length === 0) {
    return (
      <main className="lp-page-narrow">
        <Link href="/?view=projects" className="lp-link text-sm">
          ← Back to projects
        </Link>
        <p className="lp-eyebrow mt-5">Work portfolio</p>
        <h1 className="lp-title">New project</h1>
        <p className="lp-subtitle mb-5">
          You need a client before you can create a project.
        </p>
        <Link
          href="/clients/new"
          className="lp-button-primary"
        >
          Create a client first →
        </Link>
      </main>
    );
  }

  return (
    <main className="lp-page-narrow">
      <Link href="/?view=projects" className="lp-link text-sm">
        ← Back to projects
      </Link>
      <p className="lp-eyebrow mt-5">Work portfolio</p>
      <h1 className="lp-title">New project</h1>
      <p className="lp-subtitle">Capture the client, scope, status, and delivery window in one place.</p>
      <form onSubmit={handleSubmit} noValidate className="lp-card mt-6 grid gap-4">
        <input
          className="lp-input"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          className="lp-input"
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
          className="lp-input"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Scope (optional, shown to the client too)
          </p>
          <label className="text-xs text-slate-500">
            Problem
            <textarea
              className="lp-input mt-1"
              placeholder="What problem are we solving?"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={2}
            />
          </label>
          <label className="text-xs text-slate-500">
            Solution
            <textarea
              className="lp-input mt-1"
              placeholder="What are we building?"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={2}
            />
          </label>
          <label className="text-xs text-slate-500">
            Desired outcome
            <textarea
              className="lp-input mt-1"
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
            className="lp-input mt-1"
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
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-500">
            Start date
            <input
              type="date"
              className="lp-input mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Target date
            <input
              type="date"
              className="lp-input mt-1"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading || clientsLoading}
          className="lp-button-primary w-full"
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </form>
    </main>
  );
}
