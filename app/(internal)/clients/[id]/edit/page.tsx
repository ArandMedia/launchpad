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
    <main className="p-8 max-w-lg mx-auto">
      <Link href="/clients" className="text-sm text-slate-400 hover:text-slate-700">
        ← Back to clients
      </Link>
      <h1 className="text-xl font-semibold text-slate-900 mb-6 mt-2">Edit client</h1>
      <ClientEditForm client={client} />
    </main>
  );
}
