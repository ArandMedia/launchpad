import { cookies } from "next/headers";
import { TEAM_COOKIE, verifySession } from "@/lib/session";

export async function lifeOSOwner() {
  const ownerId = process.env.LIFEOS_OWNER_USER_ID;
  if (!ownerId) return null; // Fail closed until configured.
  const session = await verifySession(cookies().get(TEAM_COOKIE)?.value);
  if (!session || session.kind !== "team" || session.userId !== ownerId) return null;
  return session.userId;
}
