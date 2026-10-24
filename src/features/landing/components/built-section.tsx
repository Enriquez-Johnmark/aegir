import { ArrowDownIcon, ArrowRightIcon } from "lucide-react";

import { RULE_EXCERPT, TEST_EXCERPT, excerptHref, type Excerpt } from "@/features/landing/excerpt";
import { SECTION_IDS, SOURCE_LINKS } from "@/features/landing/links";

// The request path, left to right. Each fact is in ARCHITECTURE.md, SECURITY.md or D-039/D-044.
const STATIONS = [
  {
    name: "Browser",
    where: "Any device",
    facts: [
      "Pages stream from the server; the browser never talks to the database directly",
      "Security headers and a Content Security Policy on every response",
    ],
  },
  {
    name: "Next.js 16",
    where: "Vercel",
    via: "From the browser, over HTTPS",
    facts: [
      "Server Components read through a server-only data layer",
      "Server Actions re-check the user and validate every input with Zod",
      "The firewall rate-limits sign-in",
    ],
  },
  {
    name: "Postgres 17",
    where: "Supabase",
    via: "From the app, as the signed-in user",
    facts: [
      "Row-level security on every table, with explicit grants",
      "Triggers enforce status changes and write the audit log",
      "Only the public key reaches the app; no secret key at runtime",
    ],
  },
] as const;

const STACK = [
  "Next.js 16 (App Router)",
  "React 19",
  "TypeScript (strict)",
  "Tailwind CSS v4",
  "shadcn/ui",
  "Zod",
  "Supabase Auth",
  "Postgres 17",
  "Vitest",
  "pgTAP",
  "Playwright",
  "Vercel",
] as const;

const EVIDENCE = [
  { href: SOURCE_LINKS.ci, label: "CI on every push", detail: "lint, types, unit tests, build, migrations, pgTAP, database advisors" },
  { href: SOURCE_LINKS.testing, label: "Testing", detail: "what each suite proves and how to run it" },
  { href: SOURCE_LINKS.decisions, label: "Decision log", detail: "every material choice, with what was not taken and why" },
  { href: SOURCE_LINKS.architecture, label: "Architecture", detail: "folders, boundaries and data flow" },
] as const;

/** On /engineering: the request path, one real rule with its test, the stack and the evidence (D-050, D-051). */
export function BuiltSection() {
  return (
    <section aria-labelledby={`${SECTION_IDS.built}-title`} id={SECTION_IDS.built} className="@container scroll-mt-4 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-20 sm:px-8 lg:py-28">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2
            id={`${SECTION_IDS.built}-title`}
            className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
          >
            From the browser to the database
          </h2>
          <p className="text-lg/relaxed text-pretty text-muted-foreground">
            One Next.js app and one Postgres database, with no API server in between. The app asks the database as
            the signed-in user, and Postgres has the final say on what they may see or change.
          </p>
        </div>

        <ol aria-label="How a request travels" className="grid grid-cols-1 gap-10 @5xl:grid-cols-3 @5xl:gap-12">
          {STATIONS.map((station, index) => (
            <li key={station.name} className="relative flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
              {index > 0 && (
                <>
                  <ArrowDownIcon aria-hidden className="absolute -top-7 left-6 size-4 text-primary @5xl:hidden" />
                  <ArrowRightIcon aria-hidden className="absolute top-1/2 -left-8 hidden size-4 -translate-y-1/2 text-primary @5xl:block" />
                </>
              )}
              {"via" in station && <p className="text-xs font-medium text-muted-foreground">{station.via}</p>}
              <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold">{station.name}</span>
                <span className="text-sm text-muted-foreground">{station.where}</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-pretty text-muted-foreground">
                {station.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 gap-12 @5xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] @5xl:gap-16">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-balance">A rule, and the test that proves it</h3>
              <p className="max-w-[65ch] text-pretty text-muted-foreground">
                Work orders can only move open → in progress ↔ blocked → completed. The database refuses anything else,
                whichever screen or script asks, and a pgTAP test tries the forbidden move.
              </p>
            </div>
            <CodeExcerpt excerpt={RULE_EXCERPT} caption="The rule, in the migration" />
            <CodeExcerpt excerpt={TEST_EXCERPT} caption="Its test" />
          </div>

          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold">Stack</h3>
              <ul className="flex flex-wrap gap-x-2 gap-y-2 text-sm">
                {STACK.map((item) => (
                  <li key={item} className="rounded-md bg-muted px-2 py-1">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold">See for yourself</h3>
              <ul className="flex flex-col gap-3 text-sm">
                {EVIDENCE.map((item) => (
                  <li key={item.href} className="flex flex-col gap-0.5">
                    <a href={item.href} className="w-fit font-medium text-primary underline-offset-4 hover:underline">
                      {item.label}
                    </a>
                    <span className="text-pretty text-muted-foreground">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeExcerpt({ excerpt, caption }: { excerpt: Excerpt; caption: string }) {
  const [first, last] = excerpt.lines;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-col gap-0.5 text-sm">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium">{caption}</span>
          <a href={excerptHref(excerpt)} className="font-medium text-primary underline-offset-4 hover:underline">
            Lines {first}–{last} on GitHub
          </a>
        </span>
        <span className="font-mono text-[0.8125rem] break-all text-muted-foreground">{excerpt.path}</span>
      </figcaption>
      {/* Long lines scroll inside the block, never the page; the block takes focus so a keyboard can scroll it. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-[0.8125rem]/relaxed outline-none ring-1 ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <code>{excerpt.code}</code>
      </pre>
    </figure>
  );
}
