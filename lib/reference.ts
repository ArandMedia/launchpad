// Reference pages the internal app knows about. The content of each page is
// stored in the database (ReferenceDoc), never in this repository -- only
// the slug and the label used for navigation live here.
export const REFERENCE_PAGES: Record<string, { title: string }> = {
  "creative-engineering": { title: "Creative Engineering" },
};

export const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;

export function rewriteLaunchPADProjectsLink(html: string) {
  return html.replace(
    /(<a\b[^>]*\bhref\s*=\s*)(["'])\/\2([^>]*>\s*(?:&larr;|←)?\s*(?:Back to\s+)?LaunchPAD projects\s*<\/a>)/gi,
    (_match, prefix: string, quote: string, suffix: string) =>
      `${prefix}${quote}/?view=projects${quote}${suffix}`,
  );
}
