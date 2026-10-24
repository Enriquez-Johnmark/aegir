import { AnchorIcon } from "lucide-react";

import { ButtonLink } from "@/components/shared/button-link";
import { SECTION_IDS, SOURCE_LINKS } from "@/features/landing/links";

const NAV = [
  { href: `#${SECTION_IDS.howItWorks}`, label: "How it works" },
  { href: `#${SECTION_IDS.trust}`, label: "Why trust it" },
  { href: `#${SECTION_IDS.built}`, label: "How it's built" },
  { href: `#${SECTION_IDS.demo}`, label: "Try the demo" },
  { href: SOURCE_LINKS.repository, label: "Source" },
];

/** Sits on the night field above the hero (`dark night`: DESIGN.md, Landing page). */
export function LandingHeader() {
  return (
    <header className="dark night bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-4 py-3 sm:px-8">
        <span className="flex items-center gap-2.5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AnchorIcon aria-hidden className="size-4" />
          </span>
          Aegir
        </span>
        <nav aria-label="Page" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex h-8 items-center rounded-lg px-3 pointer-coarse:min-h-11 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          {/* The section links hide on phones; the source stays one tap away for visitors who are hiring. */}
          <ButtonLink href={SOURCE_LINKS.repository} variant="ghost" className="md:hidden">
            Source
          </ButtonLink>
          <ButtonLink href="/login" variant="outline">
            Sign in
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
