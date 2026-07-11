import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

// Deleting an update only removes the log entry -- it does not (and
// cannot) unsend a notification email that already went out. This is for
// cleaning up test entries or mistakes, not for retracting communication.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  await db.update.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
