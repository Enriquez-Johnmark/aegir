import { ArrowRightIcon, LockKeyholeIcon, PenLineIcon, ScrollTextIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

import { ScreenshotFrame } from "@/features/landing/components/screenshot-frame";
import { ENGINEERING_PATH, SECTION_IDS } from "@/features/landing/links";
import { SCREENSHOTS } from "@/features/landing/screenshots";

// What an operator gets, in their words (D-051). Each promise is enforced by the
// database; /engineering#guarantees names the mechanism and the test for each.
const FACTS = [
  {
    icon: ShieldCheckIcon,
    term: "Your company's records stay yours",
    detail:
      "Another company on the same system can never see or change your vessels, inspections or work. The demo has a second company, Meridian Tankers, only to prove it.",
  },
  {
    icon: ScrollTextIcon,
    term: "Every change is signed and dated",
    detail: "Who changed what, and when, is recorded automatically. Nobody can edit or delete an entry.",
  },
  {
    icon: LockKeyholeIcon,
    term: "The rules can't be skipped",
    detail:
      "A work order can't jump from open to completed, and safety records can't be deleted, whichever screen or script tries.",
  },
  {
    icon: PenLineIcon,
    term: "Handovers can't be rewritten",
    detail: "Once sent, a handover is fixed. Acknowledging it records who read it and when.",
  },
] as const;

export function TrustSection() {
  return (
    <section
      aria-labelledby={`${SECTION_IDS.trust}-title`}
      id={SECTION_IDS.trust}
      className="@container scroll-mt-4 border-y bg-sidebar"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-20 sm:px-8 lg:py-28 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] @5xl:gap-16">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2
              id={`${SECTION_IDS.trust}-title`}
              className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
            >
              Records you can stand behind
            </h2>
            <p className="text-lg/relaxed text-pretty text-muted-foreground">
              Safety records are only useful if nobody can quietly change them. Aegir enforces that in the system
              itself, not in good intentions.
            </p>
          </div>
          <dl className="flex flex-col gap-7">
            {FACTS.map(({ icon: Icon, term, detail }) => (
              // Long words break at 320px with 200% text, beside the icon column.
              <div key={term} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 wrap-break-word">
                <Icon aria-hidden className="row-span-2 mt-0.5 size-5 text-primary" />
                <dt className="font-medium">{term}</dt>
                <dd className="text-pretty text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
          <Link
            href={`${ENGINEERING_PATH}#${SECTION_IDS.guarantees}`}
            className="group flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            How each of these is enforced, for engineers
            <ArrowRightIcon aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <figure className="flex flex-col gap-3 @5xl:pt-2">
          {/* The log's text sits in the left half of the capture, so a wide frame shows only that half: about 14px at 1440 (D-051). */}
          <ScreenshotFrame
            shot={SCREENSHOTS.auditLog}
            crop={{ top: 0.27, height: 0.6 }}
            columns={{ x: 0.185, width: 0.435 }}
            focus={{ x: 0.185, y: 0.29, width: 0.4, height: 0.25 }} // the day heading and the first entries
            sizes="(min-width: 80rem) 92rem, (min-width: 48rem) 160vw, 250vw"
          />
          <figcaption className="text-sm text-pretty text-muted-foreground">
            The audit log in the demo: the night shift&apos;s handover acknowledged, and the fuel pump job blocked
            with its reason. Entries from the demo&apos;s sample data are signed &ldquo;System (seed data)&rdquo;.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
