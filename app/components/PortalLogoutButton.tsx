"use client";


export default function PortalLogoutButton() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/portal-login");
      }}
      className="text-sm text-slate-400 hover:text-slate-600"
    >
      Sign out
    </button>
  );
}
