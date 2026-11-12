import type { AnchorHTMLAttributes } from "react";

type StableLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

// Native navigation intentionally resets the page between workspaces. This
// keeps long iPad sessions from accumulating Next.js route payloads in memory.
export default function StableLink({ href, ...props }: StableLinkProps) {
  return <a href={href} {...props} />;
}
