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

  it("rewrites a back link with nested icon markup", () => {
    const html = '<a class="back" href="/"><span aria-hidden="true">←</span><span>Back to LaunchPAD projects</span></a>';
    expect(rewriteLaunchPADProjectsLink(html)).toContain('href="/?view=projects"');
  });

  it("rewrites the project link even when the stored target is absolute", () => {
    const html = '<a href="https://launchpad.arandmedia.com/"><span>LaunchPAD projects</span></a>';
    expect(rewriteLaunchPADProjectsLink(html)).toContain('href="/?view=projects"');
  });

  it("rewrites an unquoted stored href", () => {
    const html = '<a class=back href=/><span>Back to LaunchPAD projects</span></a>';
    expect(rewriteLaunchPADProjectsLink(html)).toContain('href="/?view=projects"');
  });

  it("adds a target when the stored project link has no href", () => {
    const html = '<a class="back"><span>Back to LaunchPAD projects</span></a>';
    expect(rewriteLaunchPADProjectsLink(html)).toContain('href="/?view=projects"');
  });
});
