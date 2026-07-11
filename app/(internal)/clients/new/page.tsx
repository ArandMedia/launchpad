"use client";

import { useState } from "react";
import Link from "next/link";

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
      <main className="p-8 max-w-lg mx-auto">
        <Link href="/clients" className="text-sm text-slate-400 hover:text-slate-700">
          ← Back to clients
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mb-4 mt-2">Client created</h1>
        <div className="bg-white border border-slate-200 rounded-lg p-5 grid gap-2 text-sm">
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
          <p className="text-xs text-slate-400 mt-2">
            This password is shown once. Share it with the client directly -- it won't be shown again.
          </p>
        </div>
        <Link href="/projects/new" className="inline-block mt-4 text-sm text-blue-600 underline">
          Create a project for this client →
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-lg mx-auto">
      <Link href="/clients" className="text-sm text-slate-400 hover:text-slate-700">
        ← Back to clients
      </Link>
      <h1 className="text-xl font-semibold text-slate-900 mb-6 mt-2">New client</h1>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Contact name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Company name (optional)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <input
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-slate-900 text-white rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create client + portal login"}
        </button>
      </form>
    </main>
  );
}
