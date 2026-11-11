import { describe, expect, it } from "vitest";
import { rewriteLaunchPADProjectsLink } from "./reference";

describe("reference navigation", () => {
  it("rewrites the stored Creative Engineering back link to the Projects dashboard", () => {
    const html = '<a class="back" href="/">← Back to LaunchPAD projects</a>';
    expect(rewriteLaunchPADProjectsLink(html)).toBe(
      '<a class="back" href="/?view=projects">← Back to LaunchPAD projects</a>',
    );
  });

  it("leaves unrelated root links unchanged", () => {
    const html = '<a href="/">Calendar home</a>';
    expect(rewriteLaunchPADProjectsLink(html)).toBe(html);
  });
});
