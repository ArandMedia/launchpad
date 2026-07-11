import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";
import { hashPassword, generateTempPassword } from "@/lib/passwords";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, companyName: true, email: true, slug: true },
  });
  return NextResponse.json({ clients });
}

// Creates a client and, in the same request, a portal login for them --
// the team never has to remember a second step, and the client never has
// to self-register. The temp password is returned once in the response
// so the caller can hand it off; it is never stored in plaintext or
// logged anywhere after this.
export async function POST(req: NextRequest) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json();
  if (!data.name || !data.email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  let baseSlug = slugify(data.slug || data.companyName || data.name);
  if (!baseSlug) baseSlug = "client";
  let slug = baseSlug;
  let suffix = 1;
  while (await db.client.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const client = await db.client.create({
    data: {
      name: data.name,
      companyName: data.companyName || undefined,
      email: data.email,
      phone: data.phone || undefined,
      slug,
      passwordHash,
    },
  });

  return NextResponse.json({ client, tempPassword }, { status: 201 });
}
