// Reference pages the internal app knows about. The content of each page is
// stored in the database (ReferenceDoc), never in this repository -- only
// the slug and the label used for navigation live here.
export const REFERENCE_PAGES: Record<string, { title: string }> = {
  "creative-engineering": { title: "Creative Engineering" },
};

export const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;

function withProjectsHref(anchor: string) {
  const quotedHref = /\bhref\s*=\s*(["'])[^"']*\1/i;
  if (quotedHref.test(anchor)) {
    return anchor.replace(quotedHref, 'href="/?view=projects"');
  }

  const unquotedHref = /\bhref\s*=\s*[^\s>]+/i;
  if (unquotedHref.test(anchor)) {
    return anchor.replace(unquotedHref, 'href="/?view=projects"');
  }

  return anchor.replace(/^<a\b/i, '<a href="/?view=projects"');
}

export function rewriteLaunchPADProjectsLink(html: string) {
  let foundNamedLink = false;
  const rewritten = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor: string) => {
    const labelSource = anchor.replace(/&(?:nbsp|#160|#x0*a0);/gi, " ");
    if (!/LaunchPAD[\s\S]{0,200}?projects/i.test(labelSource)) return anchor;

    foundNamedLink = true;
    return withProjectsHref(anchor);
  });

  if (foundNamedLink) return rewritten;

  // The uploaded Creative Engineering document keeps its back control as
  // the first anchor. Some versions expose its name through CSS/accessibility
  // rather than text in the anchor, so use the page marker as a narrow fallback.
  if (/Creative Engineering\s+MASTER REFERENCE/i.test(html)) {
    return html.replace(/<a\b[^>]*>/i, withProjectsHref);
  }

  return html;
}
