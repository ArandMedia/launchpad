"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi, clientErrorMessage } from "@/lib/client-api";

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
};

export default function ClientEditForm({ client }: { client: Client }) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [companyName, setCompanyName] = useState(client.companyName || "");
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a contact name and valid email address.");
      return;
    }
    setBusy(true);
    try {
      await clientApi(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, companyName, email, phone }),
      });
      router.push("/clients");
      router.refresh();
    } catch (caught) {
      setError(clientErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <input
        className="lp-input"
        placeholder="Contact name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="lp-input"
        placeholder="Company name"
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
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="lp-button-primary w-fit"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
