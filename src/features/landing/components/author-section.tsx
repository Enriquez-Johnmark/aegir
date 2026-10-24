import { ArrowUpRightIcon } from "lucide-react";

import { AUTHOR, SECTION_IDS, SOURCE_LINKS } from "@/features/landing/links";

const LINKS = [
  { href: AUTHOR.github, label: "GitHub profile" },
  { href: SOURCE_LINKS.repository, label: "Aegir's source code" },
  { href: SOURCE_LINKS.decisions, label: "The decision log" },
] as const;

/** The page's close for visitors who are hiring: who built it, and where to look next (D-050). */
export function AuthorSection() {
  return (
    <section
      aria-labelledby={`${SECTION_IDS.author}-title`}
      id={SECTION_IDS.author}
      className="@container scroll-mt-4 border-t"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-8 lg:py-24 @5xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] @5xl:gap-16">
        <div className="flex flex-col gap-4">
          <h2
            id={`${SECTION_IDS.author}-title`}
            className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
          >
            Built by {AUTHOR.name}
          </h2>
          <p className="max-w-[65ch] text-lg/relaxed text-pretty text-muted-foreground">
            {AUTHOR.title}. Aegir is a portfolio project: a working slice of a fleet safety system, from the database
            schema and its security model to the screens, the tests and the deployment. The decision log records each
            material choice and the alternatives that were turned down.
          </p>
        </div>
        <nav aria-label="About the author" className="@5xl:pt-2">
          <ul className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {LINKS.map((link) => (
              <li key={link.href} className="border-t first:border-t-0">
                <a
                  href={link.href}
                  className="group flex items-center justify-between gap-3 px-4 py-3 font-medium outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset pointer-coarse:min-h-11"
                >
                  {link.label}
                  <ArrowUpRightIcon
                    aria-hidden
                    className="size-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
