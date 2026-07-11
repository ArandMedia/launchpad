import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects?cursor=&limit=20
// Cursor-paginated by design — never returns the full table, since this
// needs to stay fast as the client/project count grows into the hundreds
// of thousands.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
  const cursor = searchParams.get("cursor") || undefined;
  const status = searchParams.get("status") || undefined;

  const projects = await db.project.findMany({
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: status ? { status: status as any } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { name: true, companyName: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
  });

  return NextResponse.json({
    projects,
    nextCursor: projects.length === limit ? projects[projects.length - 1].id : null,
  });
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  if (!data.name || !data.clientId) {
    return NextResponse.json({ error: "name and clientId are required" }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      status: data.status || "DISCOVERY",
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
