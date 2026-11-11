import { describe, expect, it } from "vitest";
import { landingHref, parseUserPreferences } from "./user-preferences";

describe("LaunchPAD user preferences", () => {
  it("keeps a valid owner landing page", () => {
    expect(parseUserPreferences({ defaultLanding: "CLIENTS" }, true)).toEqual({ defaultLanding: "CLIENTS" });
  });

  it("defaults owners to Calendar and team members to Projects", () => {
    expect(parseUserPreferences({}, true).defaultLanding).toBe("CALENDAR");
    expect(parseUserPreferences({}, false).defaultLanding).toBe("PROJECTS");
  });

  it("does not send a team member to the private Calendar", () => {
    expect(parseUserPreferences({ defaultLanding: "CALENDAR" }, false).defaultLanding).toBe("PROJECTS");
  });

  it("maps each preference to a stable LaunchPAD route", () => {
    expect(landingHref("CALENDAR")).toBe("/lifeos/today");
    expect(landingHref("PROJECTS")).toBe("/?view=projects");
    expect(landingHref("CLIENTS")).toBe("/clients");
  });
});
