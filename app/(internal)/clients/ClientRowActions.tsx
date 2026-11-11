"use client";

import { useRouter } from "next/navigation";

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
  const router = useRouter();

  async function toggleArchive() {
    if (!archived && !confirm(`Archive ${clientName}? Their projects and history stay intact — they just drop out of your default client list.`)) {
      return;
    }
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !archived }),
    });
    router.refresh();
  }

  async function deleteClient() {
    if (projectCount > 0) {
      alert(`${clientName} has ${projectCount} project(s). Archive instead, or delete their projects first.`);
      return;
    }
    if (!confirm(`Permanently delete ${clientName}? This can't be undone.`)) return;
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Couldn't delete this client.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={toggleArchive} className="lp-button-ghost">
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button onClick={deleteClient} className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-800">
        Delete
      </button>
    </div>
  );
}
