import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const client = await db.client.findUnique({
    where: { id: params.id },
    include: { _count: { select: { projects: true } } },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { passwordHash: _omit, ...safeClient } = client;
  return NextResponse.json({ client: safeClient });
}

// Edits contact details and/or toggles archival (`archived: true/false`).
// Archiving is the reversible way to retire a client -- their projects,
// history, and portal login all stay intact, they just drop out of the
// default client list.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json();
  const client = await db.client.update({
    where: { id: params.id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.companyName !== undefined ? { companyName: data.companyName || null } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.archived !== undefined ? { archivedAt: data.archived ? new Date() : null } : {}),
    },
  });

  const { passwordHash: _omit, ...safeClient } = client;
  return NextResponse.json({ client: safeClient });
}

// Hard delete is only allowed once a client has zero projects -- deleting
// a client with active or historical projects would silently take their
// project history with it, which is exactly the kind of data loss this
// system is meant to prevent. Archive instead for anything with history.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const projectCount = await db.project.count({ where: { clientId: params.id } });
  if (projectCount > 0) {
    return NextResponse.json(
      { error: `This client has ${projectCount} project(s). Archive the client instead of deleting, or delete their projects first.` },
      { status: 409 }
    );
  }

  await db.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
