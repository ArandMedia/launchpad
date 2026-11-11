export const landingPages = ["CALENDAR", "PROJECTS", "CLIENTS"] as const;

export type LandingPage = (typeof landingPages)[number];

export type UserPreferences = {
  defaultLanding: LandingPage;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseUserPreferences(value: unknown, canUseCalendar: boolean): UserPreferences {
  const requested = isRecord(value) && landingPages.includes(value.defaultLanding as LandingPage)
    ? value.defaultLanding as LandingPage
    : canUseCalendar ? "CALENDAR" : "PROJECTS";

  return {
    defaultLanding: requested === "CALENDAR" && !canUseCalendar ? "PROJECTS" : requested,
  };
}

export function landingHref(value: LandingPage) {
  if (value === "CALENDAR") return "/lifeos/today";
  if (value === "CLIENTS") return "/clients";
  return "/?view=projects";
}
