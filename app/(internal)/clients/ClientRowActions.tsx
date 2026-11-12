"use client";

import { useState } from "react";
import { clientApi, clientErrorMessage } from "@/lib/client-api";

export default function ClientRowActions({
  clientId,
  clientName,
  archived,
  projectCount,
}: {
  clientId: string;
  clientName: string;
  archived: boolean;
  projectCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggleArchive() {
    if (!archived && !confirm(`Archive ${clientName}? Their projects and history stay intact — they just drop out of your default client list.`)) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      await clientApi(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !archived }),
      });
      window.location.reload();
    } catch (caught) {
      setError(clientErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteClient() {
    if (projectCount > 0) {
      alert(`${clientName} has ${projectCount} project(s). Archive instead, or delete their projects first.`);
      return;
    }
    if (!confirm(`Permanently delete ${clientName}? This can't be undone.`)) return;
    setError("");
    setBusy(true);
    try {
      await clientApi(`/api/clients/${clientId}`, { method: "DELETE" });
      window.location.reload();
    } catch (caught) {
      setError(clientErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {error && <span role="alert" className="w-full text-right text-xs text-red-600">{error}</span>}
      <button disabled={busy} onClick={toggleArchive} className="lp-button-ghost disabled:opacity-50">
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button disabled={busy} onClick={deleteClient} className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-800 disabled:opacity-50">
        Delete
      </button>
    </div>
  );
}
