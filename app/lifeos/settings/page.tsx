import { IntegrationsPanel } from "../core-summary";
import SectionHeader from "../section-header";

export default function SettingsPage() {
  return <>
    <SectionHeader eyebrow="Integrations & settings" title="Consent, security & data readiness" description="See exactly what is connected and authorized. No connector is represented as live until its consent flow and data adapter are complete." />
    <IntegrationsPanel />
    <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Private-data boundary</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">All LifeOS records are owner-scoped. Health values are stored as authenticated ciphertext in a separate table. Integrations must declare scopes and retention before connection; disconnect and deletion controls will appear with a real connection, never a simulated one.</p>
    </section>
  </>;
}
