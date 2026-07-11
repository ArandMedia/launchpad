import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

// Toggle visibility (and optionally rename/recategorize) a document.
// Deliberately separate from Update's clientVisible flow -- documents don't
// trigger a notification email on their own; the team posts an Update to
// tell the client "the SOW is ready" if they want that.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json();
  const document = await db.document.update({
    where: { id: params.id },
    data: {
      ...(data.title ? { title: data.title } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.clientVisible !== undefined ? { clientVisible: data.clientVisible } : {}),
    },
  });

  return NextResponse.json({ document });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const document = await db.document.findUnique({ where: { id: params.id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // document.url holds the blob pathname (private store -- see upload route).
  await del(document.url).catch(() => {
    // If the blob is already gone (or the token is misconfigured), don't
    // block deleting the database record -- an orphaned blob is a minor
    // storage cost, but an orphaned DB row is a confusing dangling link.
  });
  await db.document.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
