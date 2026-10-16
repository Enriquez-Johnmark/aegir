import { DatabaseIcon, FlaskConicalIcon, ScrollTextIcon, ShieldCheckIcon } from "lucide-react";

import { ScreenshotFrame } from "@/features/landing/components/screenshot-frame";
import { SECTION_IDS, SOURCE_LINKS } from "@/features/landing/links";
import { SCREENSHOTS } from "@/features/landing/screenshots";

// Each fact is enforced or checked in the repository (SECURITY.md, TESTING.md); no counts, they go stale.
const FACTS = [
  {
    icon: ShieldCheckIcon,
    term: "Each organization is sealed off",
    detail:
      "Postgres row-level security filters every table, so one company never sees or changes another's data. The demo has a second company, Meridian Tankers, only to prove it.",
  },
  {
    icon: ScrollTextIcon,
    term: "The audit trail writes itself",
    detail:
      "Database triggers record every change: what changed, who made it and when. Nobody can edit or delete an entry.",
  },
  {
    icon: DatabaseIcon,
    term: "The rules live in the database",
    detail:
      "Status changes and who may make them are checked by Postgres as well as the app, and safety records can't be deleted.",
  },
  {
    icon: FlaskConicalIcon,
    term: "Tested where it matters",
    detail:
      "pgTAP tests for every access rule, unit tests for the domain rules, Playwright for the main workflows and axe on every page. CI runs on every push.",
  },
] as const;

export function TrustSection() {
  return (
    <section
      aria-labelledby={`${SECTION_IDS.trust}-title`}
      id={SECTION_IDS.trust}
      className="@container scroll-mt-4 border-y bg-sidebar"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-20 sm:px-8 lg:py-28 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @5xl:gap-16">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2
              id={`${SECTION_IDS.trust}-title`}
              className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
            >
              Records you can stand behind
            </h2>
            <p className="text-lg/relaxed text-pretty text-muted-foreground">
              Safety records are only useful if nobody can quietly change them. Aegir puts that guarantee in the
              database, not in good intentions.
            </p>
          </div>
          <dl className="flex flex-col gap-7">
            {FACTS.map(({ icon: Icon, term, detail }) => (
              <div key={term} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
                <Icon aria-hidden className="row-span-2 mt-0.5 size-5 text-primary" />
                <dt className="font-medium">{term}</dt>
                <dd className="text-pretty text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            How it&apos;s built and checked:{" "}
            <a href={SOURCE_LINKS.security} className="font-medium text-primary underline-offset-4 hover:underline">
              security model
            </a>
            ,{" "}
            <a href={SOURCE_LINKS.testing} className="font-medium text-primary underline-offset-4 hover:underline">
              testing
            </a>{" "}
            and{" "}
            <a href={SOURCE_LINKS.architecture} className="font-medium text-primary underline-offset-4 hover:underline">
              architecture
            </a>
            .
          </p>
        </div>
        <figure className="flex flex-col gap-3 @5xl:pt-2">
          <ScreenshotFrame
            shot={SCREENSHOTS.auditLog}
            visibleHeight={0.8}
            focus={{ x: 0.185, y: 0.276, width: 0.415, height: 0.34 }} // the day heading and the first entries
            sizes="(min-width: 80rem) 46rem, (min-width: 48rem) 63vw, 250vw"
          />
          <figcaption className="text-sm text-muted-foreground">
            The audit log in the demo. Entries loaded with the demo data read &ldquo;System (seed data)&rdquo;.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
