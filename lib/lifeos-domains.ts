export const LIFEOS_DOMAINS = ["HEALTH", "WEALTH", "RELATIONSHIPS", "SELF", "ARANDMEDIA", "OMNIS"] as const;
export type LifeOSDomainKey = (typeof LIFEOS_DOMAINS)[number];

export const DOMAIN_LABELS: Record<LifeOSDomainKey, string> = {
  HEALTH: "Health",
  WEALTH: "Wealth",
  RELATIONSHIPS: "Relationships",
  SELF: "Self & Purpose",
  ARANDMEDIA: "ArandMedia",
  OMNIS: "Operation OMNIS",
};

export function isDomainKey(value: unknown): value is LifeOSDomainKey {
  return typeof value === "string" && LIFEOS_DOMAINS.includes(value as LifeOSDomainKey);
}

export const INTEGRATION_ADAPTERS = [
  { key: "APPLE_HEALTH", label: "Apple Health", domainKey: "HEALTH", readiness: "IPHONE_COMPANION_REQUIRED", description: "Requires a private signed iPhone companion to request HealthKit authorization." },
  { key: "OURA", label: "Oura", domainKey: "HEALTH", readiness: "AUTHORIZATION_REQUIRED", description: "A provider application and OAuth consent flow must be configured before any account or scopes can connect." },
  { key: "HUME", label: "Hume", domainKey: "HEALTH", readiness: "AUTHORIZATION_REQUIRED", description: "A provider application, explicit consent, and API authorization are required before any signal data can be used." },
  { key: "FINANCIAL", label: "Financial accounts", domainKey: "WEALTH", readiness: "PROVIDER_REQUIRED", description: "No financial provider is connected. Manual evidence remains available." },
] as const;
