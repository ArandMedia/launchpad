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
    <div className="flex items-center gap-3">
      <button onClick={toggleArchive} className="text-sm text-slate-400 hover:text-slate-700">
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button onClick={deleteClient} className="text-sm text-red-500 hover:underline">
        Delete
      </button>
    </div>
  );
}
