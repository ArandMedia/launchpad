import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";
import { REFERENCE_PAGES, MAX_REFERENCE_BYTES } from "@/lib/reference";

// Loads or replaces the stored page for a reference slug. The body is the
// complete HTML document. Admin-only: this content is private to the
// account owner, and whatever is stored here is served as a page on this
// domain, so it must never be writable by a regular team member.
export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;
  if (auth.session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can update reference pages." }, { status: 403 });
  }

  const page = REFERENCE_PAGES[params.slug];
  if (!page) return NextResponse.json({ error: "Unknown reference page." }, { status: 404 });

  const html = await req.text();
  if (!html.trim()) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }
  if (Buffer.byteLength(html, "utf8") > MAX_REFERENCE_BYTES) {
    return NextResponse.json({ error: "The file is larger than 3 MB." }, { status: 413 });
  }
  if (!/<html[\s>]/i.test(html)) {
    return NextResponse.json(
      { error: "That doesn't look like an HTML page. Choose the reference .html file." },
      { status: 400 }
    );
  }

  await db.referenceDoc.upsert({
    where: { slug: params.slug },
    create: { slug: params.slug, title: page.title, html },
    update: { title: page.title, html },
  });

  return NextResponse.json({ ok: true });
}
