import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamSession } from "@/lib/require-auth";

const projectStatuses = ["DISCOVERY", "IN_PROGRESS", "REVIEW", "BLOCKED", "COMPLETE"] as const;
const invalid = (error: string) => NextResponse.json({ error }, { status: 400 });

function calendarDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
}

// GET /api/projects?cursor=&limit=20
// Cursor-paginated by design — never returns the full table, since this
// needs to stay fast as the client/project count grows into the hundreds
// of thousands.
export async function GET(req: NextRequest) {
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;
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
  const auth = await requireTeamSession();
  if ("error" in auth) return auth.error;

  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return invalid("Enter valid project details");
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const clientId = typeof data.clientId === "string" ? data.clientId : "";
  if (!name || name.length > 200) return invalid("Enter a project name of 200 characters or less");
  if (!clientId) return invalid("Choose a client");
  const status = data.status || "DISCOVERY";
  if (!projectStatuses.includes(status)) return invalid("Choose a valid project status");
  const startDate = calendarDate(data.startDate);
  const targetDate = calendarDate(data.targetDate);
  if (startDate === null) return invalid("Choose a valid start date");
  if (targetDate === null) return invalid("Choose a valid target date");
  if (!(await db.client.findUnique({ where: { id: clientId }, select: { id: true } }))) return invalid("Choose an existing client");

  const project = await db.project.create({
    data: {
      name,
      description: data.description,
      problem: data.problem || undefined,
      solution: data.solution || undefined,
      desiredOutcome: data.desiredOutcome || undefined,
      clientId,
      status,
      startDate,
      targetDate,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
