import { cookies } from "next/headers";
import { TEAM_COOKIE, verifySession, type Session, type TeamSession } from "@/lib/session";

export function isLifeOSOwner(
  session: Session | null,
  ownerId = process.env.LIFEOS_OWNER_USER_ID
): session is TeamSession {
  return Boolean(
    ownerId &&
      session?.kind === "team" &&
      session.userId === ownerId
  );
}

export async function lifeOSOwner() {
  const session = await verifySession((await cookies()).get(TEAM_COOKIE)?.value);
  return isLifeOSOwner(session) ? session.userId : null;
}
