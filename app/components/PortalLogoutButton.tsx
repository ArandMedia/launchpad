"use client";

import { useRouter } from "next/navigation";

export default function PortalLogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/portal-login");
        router.refresh();
      }}
      className="text-sm text-slate-400 hover:text-slate-600"
    >
      Sign out
    </button>
  );
}
