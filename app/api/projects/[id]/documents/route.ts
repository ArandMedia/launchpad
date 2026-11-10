import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

const VALID_CATEGORIES = ["CONTRACT", "INVOICE", "SOW", "OTHER"];
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const project = await db.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const title = (formData.get("title") as string) || "";
  const category = (formData.get("category") as string) || "OTHER";
  const clientVisible = formData.get("clientVisible") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 25MB limit" }, { status: 400 });
  }

  // Private store: this pathname is NOT a public URL. It's only readable
  // through get() with the server's BLOB_READ_WRITE_TOKEN, which is what
  // /api/documents/[id]/download does after checking the requester's
  // session. Scoped by project so files are physically organized per
  // project too, not just filtered by projectId in the database.
  const blob = await put(`projects/${params.id}/${Date.now()}-${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  const document = await db.document.create({
    data: {
      title: title.trim(),
      category: category as any,
      url: blob.pathname,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      clientVisible,
      projectId: params.id,
      uploadedById: auth.session.userId,
    },
  });

  return NextResponse.json({ document }, { status: 201 });
}
