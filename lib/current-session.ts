import { cookies } from "next/headers";
import { verifySession, TEAM_COOKIE, CLIENT_COOKIE, type TeamSession, type ClientSession } from "./session";

// Server Component / Route Handler helper (Node runtime). Reads the
// signed session cookie and verifies it -- does not trust the cookie
// value on its own.

export async function getTeamSession(): Promise<TeamSession | null> {
  const token = (await cookies()).get(TEAM_COOKIE)?.value;
  const session = await verifySession(token);
  return session?.kind === "team" ? session : null;
}

export async function getClientSession(): Promise<ClientSession | null> {
  const token = (await cookies()).get(CLIENT_COOKIE)?.value;
  const session = await verifySession(token);
  return session?.kind === "client" ? session : null;
}
