import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isResourcePillar, isResourceType, safeResourceUrl } from "@/lib/pillar-resources";
import { lifeOSOwner } from "@/lib/lifeos-auth";

const fail = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (message = "Invalid resource") => NextResponse.json({ error: message }, { status: 400 });

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function payload(body: Record<string, unknown>) {
  const pillarKey = isResourcePillar(body.pillarKey) ? body.pillarKey : null;
  const resourceType = isResourceType(body.resourceType) ? body.resourceType : null;
  const title = text(body.title, 180);
  const category = text(body.category, 80);
  const url = safeResourceUrl(body.url);
  if (!pillarKey || !resourceType || !title || !category || url === null) return null;
  return {
    pillarKey,
    resourceType,
    title,
    category,
    description: text(body.description, 5_000),
    url,
    favorite: Boolean(body.favorite),
  };
}

export async function GET() {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const resources = await db.lifeOSPillarResource.findMany({
    where: { ownerId },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });
  return NextResponse.json({ resources: resources.map((resource) => ({ ...resource, builtIn: false })) });
}

export async function POST(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return invalid();
  const data = payload(body);
  if (!data) return invalid("Add a title and category, and use a valid http or https link when one is included.");
  const resource = await db.lifeOSPillarResource.create({ data: { ownerId, ...data } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: data.pillarKey, entityType: "PILLAR_RESOURCE", entityId: resource.id, action: "CREATED", summary: `${data.title} added to pillar resources` } });
  return NextResponse.json({ resource: { ...resource, builtIn: false } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.id !== "string") return invalid();
  const data = payload(body);
  if (!data) return invalid("Add a title and category, and use a valid http or https link when one is included.");
  const updated = await db.lifeOSPillarResource.updateMany({ where: { id: body.id, ownerId }, data });
  if (!updated.count) return fail();
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: data.pillarKey, entityType: "PILLAR_RESOURCE", entityId: body.id, action: "UPDATED", summary: `${data.title} updated` } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ownerId = await lifeOSOwner();
  if (!ownerId) return fail();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") return invalid();
  const resource = await db.lifeOSPillarResource.findFirst({ where: { id: body.id, ownerId } });
  if (!resource) return fail();
  await db.lifeOSPillarResource.deleteMany({ where: { id: resource.id, ownerId } });
  await db.lifeOSActivity.create({ data: { ownerId, domainKey: resource.pillarKey, entityType: "PILLAR_RESOURCE", entityId: resource.id, action: "DELETED", summary: `${resource.title} removed` } });
  return NextResponse.json({ ok: true });
}
