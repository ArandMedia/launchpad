"use client";

import { useState } from "react";
import Link from "@/app/components/StableLink";

export default function NewClientPage() {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ slug: string; tempPassword: string; email: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, companyName, email, phone }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setResult({ slug: data.client.slug, tempPassword: data.tempPassword, email: data.client.email });
  }

  if (result) {
    return (
      <main className="lp-page-narrow">
        <Link href="/clients" className="lp-link text-sm">
          ← Back to clients
        </Link>
        <p className="lp-eyebrow mt-5">Client portal</p>
        <h1 className="lp-title mb-5">Client created</h1>
        <div className="lp-card grid gap-2 text-sm">
          <p>
            Portal URL:{" "}
            <span className="font-mono text-slate-700">
              https://portal.arandmedia.com/{result.slug}
            </span>
          </p>
          <p>
            Login email: <span className="font-mono text-slate-700">{result.email}</span>
          </p>
          <p>
            Temporary password: <span className="font-mono text-slate-700">{result.tempPassword}</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            This password is shown once. Share it with the client directly -- it won't be shown again.
          </p>
        </div>
        <Link href="/projects/new" className="lp-button-primary mt-4">
          Create a project for this client →
        </Link>
      </main>
    );
  }

  return (
    <main className="lp-page-narrow">
      <Link href="/clients" className="lp-link text-sm">
        ← Back to clients
      </Link>
      <p className="lp-eyebrow mt-5">Relationships</p>
      <h1 className="lp-title">New client</h1>
      <p className="lp-subtitle">Create the client record and a secure portal login in one step.</p>
      <form onSubmit={handleSubmit} className="lp-card mt-6 grid gap-4">
        <input
          className="lp-input"
          placeholder="Contact name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="lp-input"
          placeholder="Company name (optional)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <input
          className="lp-input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="lp-input"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="lp-button-primary w-full"
        >
          {loading ? "Creating…" : "Create client + portal login"}
        </button>
      </form>
    </main>
  );
}
