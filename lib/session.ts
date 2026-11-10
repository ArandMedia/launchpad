import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

// Edge-safe session helpers (used by middleware AND API routes). No bcrypt
// here on purpose -- bcrypt isn't edge-compatible, so password hashing lives
// in lib/passwords.ts and is only imported from Node-runtime route handlers.

export type TeamSession = {
  kind: "team";
  userId: string;
  email: string;
  role: "ADMIN" | "TEAM";
};

export type ClientSession = {
  kind: "client";
  clientId: string;
  slug: string;
  email: string;
};

export type Session = TeamSession | ClientSession;

export const TEAM_COOKIE = "launchpad_session";
export const CLIENT_COOKIE = "launchpad_portal_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it as an environment variable before using auth."
    );
  }
  return new TextEncoder().encode(secret);
}

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function signSession(payload: Session): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind === "team") {
      return {
        kind: "team",
        userId: String(payload.userId),
        email: String(payload.email),
        role: payload.role === "ADMIN" ? "ADMIN" : "TEAM",
      };
    }
    if (payload.kind === "client") {
      return {
        kind: "client",
        clientId: String(payload.clientId),
        slug: String(payload.slug),
        email: String(payload.email),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
