import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
export { DOMAIN_LABELS, INTEGRATION_ADAPTERS, LIFEOS_DOMAINS, isDomainKey, type LifeOSDomainKey } from "./lifeos-domains";

function encryptionKey() {
  const secret = process.env.LIFEOS_HEALTH_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) throw new Error("Health encryption is not configured");
  return createHash("sha256").update(`${secret}:lifeos-health-v1`).digest();
}

export function encryptHealthPayload(payload: { value: number; note: string }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptHealthPayload(record: { ciphertext: string; iv: string; authTag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(record.iv, "base64"));
  decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "base64")), decipher.final()]);
  const parsed = JSON.parse(plain.toString("utf8"));
  if (typeof parsed.value !== "number" || typeof parsed.note !== "string") throw new Error("Invalid health payload");
  return parsed as { value: number; note: string };
}

