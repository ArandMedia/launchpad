import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClientEditForm from "./ClientEditForm";

export const dynamic = "force-dynamic";

export default async function EditClientPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const client = await db.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();

  return (
    <main className="lp-page-narrow">
      <Link href="/clients" className="lp-link text-sm">
        ← Back to clients
      </Link>
      <p className="lp-eyebrow mt-5">Relationships</p>
      <h1 className="lp-title">Edit client</h1>
      <p className="lp-subtitle">Keep contact details and portal identity current.</p>
      <div className="lp-card mt-6"><ClientEditForm client={client} /></div>
    </main>
  );
}
