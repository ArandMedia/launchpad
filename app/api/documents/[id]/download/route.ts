import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { getTeamSession, getClientSession } from "@/lib/current-session";

// Streams a private document to whoever is allowed to see it. Auth is
// re-checked right here (not just in middleware) per this project's
// standing rule: every read of client-scoped data is verified at the
// point it's served, not just at the route-matching layer.
//
// - Team members can download any document.
// - Clients can only download documents that are (a) marked clientVisible
//   and (b) belong to a project owned by their own client record.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const document = await db.document.findUnique({
    where: { id: params.id },
    include: { project: { include: { client: true } } },
  });

  if (!document) {
    return new NextResponse("Not found", { status: 404 });
  }

  const teamSession = await getTeamSession();
  if (!teamSession) {
    const clientSession = await getClientSession();
    const allowed =
      clientSession &&
      document.clientVisible &&
      clientSession.clientId === document.project.clientId;
    if (!allowed) {
      return new NextResponse("Not authorized", { status: 403 });
    }
  }

  const result = await get(document.url, { access: "private" });
  if (result?.statusCode !== 200 || !result.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
