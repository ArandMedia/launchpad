"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import CalendarIntegrations from "@/app/lifeos/integrations/calendar-integrations";
import type { LandingPage, UserPreferences } from "@/lib/user-preferences";

type SettingsTab = "general" | "integrations" | "account";
type Account = { name: string; email: string; role: "ADMIN" | "TEAM" };

const tabs: Array<{ id: SettingsTab; label: string; detail: string }> = [
  { id: "general", label: "General", detail: "LaunchPAD defaults" },
  { id: "integrations", label: "Integrations", detail: "Calendar feeds" },
  { id: "account", label: "Account", detail: "Profile & security" },
];

const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200";
const primary = "min-h-11 rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:opacity-50";

async function updateSettings(body: object) {
  const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Unable to save settings");
  return result;
}

export default function SettingsPanel({ initialTab, initialAccount, initialPreferences, canUseCalendar }: {
  initialTab: SettingsTab;
  initialAccount: Account;
  initialPreferences: UserPreferences;
  canUseCalendar: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [account, setAccount] = useState(initialAccount);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const visibleTabs = tabs.filter((item) => item.id !== "integrations" || canUseCalendar);

  function openTab(next: SettingsTab) {
    setTab(next); setNotice(""); setError("");
    router.replace(next === "general" ? "/settings" : `/settings?tab=${next}`, { scroll: false });
  }

  async function savePreferences(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await updateSettings({ kind: "preferences", defaultLanding: preferences.defaultLanding });
      setPreferences(result.preferences); setNotice("LaunchPAD defaults saved");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save defaults"); }
    finally { setBusy(false); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await updateSettings({ kind: "profile", name: account.name, email: account.email });
      setAccount(result.account); setNotice("Account details saved"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save account"); }
    finally { setBusy(false); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (newPassword !== confirmPassword) { setError("New passwords do not match"); return; }
    setBusy(true);
    try {
      await updateSettings({ kind: "password", currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setNotice("Password updated");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update password"); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">LaunchPAD preferences</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage how LaunchPAD opens, connect read-only calendars, and keep your account secure.</p></div>
      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">{account.role === "ADMIN" ? "Administrator" : "Team member"}</span>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:block lg:space-y-2" aria-label="Settings sections">
        {visibleTabs.map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => openTab(item.id)} className={`min-h-12 min-w-[10rem] rounded-xl px-3 py-2 text-left transition lg:w-full ${tab === item.id ? "bg-violet-700 text-white shadow" : "text-slate-700 hover:bg-slate-100"}`}><span className="block font-semibold">{item.label}</span><span className={`block text-xs ${tab === item.id ? "text-violet-100" : "text-slate-500"}`}>{item.detail}</span></button>)}
      </nav>

      <div className="min-w-0">
        <div aria-live="polite" className="space-y-2">
          {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>

        {tab === "general" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="general-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Platform</p><h2 id="general-heading" className="mt-1 text-xl font-bold text-slate-950">General</h2><p className="mt-2 text-sm leading-6 text-slate-600">Choose the first workspace you see after signing in or selecting the LaunchPAD logo.</p>
          <form onSubmit={savePreferences} className="mt-5 max-w-xl space-y-5">
            <fieldset><legend className="font-semibold text-slate-900">Default landing page</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(["CALENDAR", "PROJECTS", "CLIENTS"] as LandingPage[]).filter((value) => value !== "CALENDAR" || canUseCalendar).map((value) => <label key={value} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border p-3 ${preferences.defaultLanding === value ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><input type="radio" name="defaultLanding" value={value} checked={preferences.defaultLanding === value} onChange={() => setPreferences({ defaultLanding: value })} className="accent-violet-700" /><span className="font-medium">{value === "CALENDAR" ? "Calendar" : value === "PROJECTS" ? "Projects" : "Clients"}</span></label>)}
            </div></fieldset>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600"><strong className="text-slate-900">Current platform behavior</strong><br />Archived projects and clients stay hidden from everyday lists, client portal access remains isolated, and Calendar uses Central Time.</div>
            <button disabled={busy} className={primary}>{busy ? "Saving…" : "Save general settings"}</button>
          </form>
        </section>}

        {tab === "integrations" && <section className="rounded-2xl bg-slate-950 p-1 text-slate-100 shadow-sm sm:p-2" aria-labelledby="integrations-heading"><div className="px-4 pt-4 sm:px-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Connections</p><h2 id="integrations-heading" className="mt-1 text-xl font-bold">Integrations</h2><p className="mt-2 text-sm leading-6 text-slate-400">Calendar subscriptions stay read-only and keep their existing labels and colors.</p></div><CalendarIntegrations /></section>}

        {tab === "account" && <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="profile-heading"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Identity</p><h2 id="profile-heading" className="mt-1 text-xl font-bold text-slate-950">Account details</h2><form onSubmit={saveProfile} className="mt-5 max-w-xl space-y-4"><label className="block font-medium text-slate-800">Name<input required maxLength={100} value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} className={field} /></label><label className="block font-medium text-slate-800">Email<input required type="email" autoCapitalize="none" autoCorrect="off" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} className={field} /></label><button disabled={busy} className={primary}>{busy ? "Saving…" : "Save account details"}</button></form></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="password-heading"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Security</p><h2 id="password-heading" className="mt-1 text-xl font-bold text-slate-950">Change password</h2><p className="mt-2 text-sm text-slate-600">Confirm your current password before replacing it.</p><form onSubmit={savePassword} className="mt-5 max-w-xl space-y-4"><label className="block font-medium text-slate-800">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={field} /></label><label className="block font-medium text-slate-800">New password<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={field} /></label><label className="block font-medium text-slate-800">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={field} /></label><button disabled={busy} className={primary}>{busy ? "Updating…" : "Update password"}</button></form></section>
        </div>}
      </div>
    </div>
  </main>;
}
