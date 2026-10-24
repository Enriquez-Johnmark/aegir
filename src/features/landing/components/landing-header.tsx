import { AnchorIcon } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/shared/button-link";
import { ENGINEERING_PATH, SECTION_IDS } from "@/features/landing/links";

// Root-relative so the same header works on `/` and on the engineering page (D-051).
const NAV = [
  { href: `/#${SECTION_IDS.howItWorks}`, label: "How it works" },
  { href: `/#${SECTION_IDS.trust}`, label: "Why trust it" },
  { href: `/#${SECTION_IDS.scope}`, label: "What it replaces" },
];

/**
 * Sits on the night field (`dark night`: DESIGN.md, Landing page). The one primary
 * action is the demo; "For engineers" sits apart at the end of the section links, and
 * Sign in is a quiet link for people who already have an account.
 */
export function LandingHeader() {
  return (
    <header className="dark night bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AnchorIcon aria-hidden className="size-4" />
          </span>
          Aegir
        </Link>
        <nav aria-label="Page" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
            <li aria-hidden className="mx-2 h-4 w-px bg-border" />
            <li>
              <NavLink href={ENGINEERING_PATH}>For engineers</NavLink>
            </li>
          </ul>
        </nav>
        {/* Wraps under the wordmark when enlarged text leaves no room beside it. */}
        <div className="flex flex-wrap items-center gap-1">
          <ButtonLink href="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink href={`/#${SECTION_IDS.demo}`}>Try the demo</ButtonLink>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-lg px-3 pointer-coarse:min-h-11 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}
