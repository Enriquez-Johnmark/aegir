import { CircleAlertIcon, ClockAlertIcon, FlagIcon, OctagonAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ForYouBadge, HandoverStatusBadge } from "@/features/handovers/components/handover-badges";
import { CheckResultBadge, SeverityBadge } from "@/features/inspections/components/inspection-badges";
import { ScreenshotFrame, type Band, type Region } from "@/features/landing/components/screenshot-frame";
import { SECTION_IDS } from "@/features/landing/links";
import { SCREENSHOTS, type Screenshot } from "@/features/landing/screenshots";
import {
  OverdueBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/features/work-orders/components/work-order-badges";

type Step = {
  title: string;
  body: string;
  signals: React.ReactNode;
  shot: Screenshot;
  /** The band a wide frame shows, measured on the screenshot. */
  crop: Band;
  /** What a phone zooms to (fractions of the capture), measured on the screenshot. */
  focus: Region;
};

// One failed check followed to the fix, in the demo's own screens and badges.
const STEPS: Step[] = [
  {
    title: "The inspector records it on deck",
    body: "Each check is pass, fail or not applicable. A failure needs a finding and a severity, and it is flagged until work is raised for it.",
    signals: (
      <>
        <CheckResultBadge result="fail" />
        <SeverityBadge severity="critical" />
        <Badge variant="warning">
          <FlagIcon data-icon="inline-start" />
          Needs follow-up
        </Badge>
      </>
    ),
    shot: SCREENSHOTS.inspection,
    crop: { top: 0.38, height: 0.375 }, // the checklist and both failed checks
    focus: { x: 0.19, y: 0.4, width: 0.365, height: 0.21 }, // the checklist and the first failed check
  },
  {
    title: "The fix becomes a work order",
    body: "Raised from the failed check and linked back to it. Assign it, set a priority and a due date, then start it, block it with a reason, or complete it. Every move goes into its history.",
    signals: (
      <>
        <PriorityBadge priority="critical" />
        <WorkOrderStatusBadge status="blocked" />
        <OverdueBadge />
      </>
    ),
    shot: SCREENSHOTS.workOrder,
    crop: { top: 0.205, height: 0.64 }, // the block reason, the facts, the failed check and the history
    focus: { x: 0.185, y: 0.11, width: 0.335, height: 0.17 }, // the title, its Blocked badge and the reason
  },
  {
    title: "Unfinished work is handed over",
    body: "At shift change, the outstanding tasks go to a named colleague, who acknowledges them. A handover can't be edited once it's sent.",
    signals: (
      <>
        <ForYouBadge />
        <HandoverStatusBadge status="pending" />
        <HandoverStatusBadge status="acknowledged" />
      </>
    ),
    shot: SCREENSHOTS.handovers,
    crop: { top: 0.15, height: 0.775 }, // the inbox
    focus: { x: 0.535, y: 0.55, width: 0.41, height: 0.4 }, // from and to, when, and the For you / Pending badges
  },
  {
    title: "The manager sees the whole fleet",
    body: "The dashboard and the vessel watch list put critical, blocked and overdue work first. Every figure comes from a live query, not a report.",
    signals: (
      <>
        <Badge variant="destructive">
          <OctagonAlertIcon data-icon="inline-start" />1 critical
        </Badge>
        <Badge variant="destructive">
          <ClockAlertIcon data-icon="inline-start" />1 overdue
        </Badge>
        <Badge variant="warning">
          <CircleAlertIcon data-icon="inline-start" />1 blocked
        </Badge>
      </>
    ),
    shot: SCREENSHOTS.vessels,
    crop: { top: 0.14, height: 0.795 }, // the watch list
    focus: { x: 0.605, y: 0.437, width: 0.38, height: 0.495 }, // status, open work and attention
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby={`${SECTION_IDS.howItWorks}-title`} id={SECTION_IDS.howItWorks} className="@container scroll-mt-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-20 sm:px-8 lg:py-28">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2
            id={`${SECTION_IDS.howItWorks}-title`}
            className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
          >
            One failed check, followed to the fix
          </h2>
          <p className="text-lg/relaxed text-pretty text-muted-foreground">
            What happens to a safety finding in Aegir, shown in the demo&apos;s own screens. Each role sees the part
            that is theirs.
          </p>
        </div>
        {/* The line down the left joins the steps (a finding never leaves the trail); it needs 20rem, so enlarged text on a phone stacks the number above the step instead. */}
        {/* Each step's words sit above its screenshot, which takes the full width so the app's own text stays readable (about 13px at 1440, D-050). */}
        <ol className="relative flex flex-col gap-16 before:absolute before:top-4 before:bottom-4 before:left-4 before:hidden before:w-px before:bg-border lg:gap-20 @xs:before:block">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-6 @xs:pl-14">
              <span
                aria-hidden
                className="flex size-8 @xs:absolute @xs:top-0 @xs:left-0 items-center justify-center rounded-full bg-background text-sm font-medium tabular-nums ring-1 ring-foreground/15"
              >
                {index + 1}
              </span>
              <div className="grid gap-3 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @5xl:items-end @5xl:gap-x-14">
                <div className="flex flex-col gap-3 @5xl:pt-1">
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-balance">{step.title}</h3>
                  <p className="max-w-[65ch] text-pretty text-muted-foreground">{step.body}</p>
                </div>
                <p className="flex flex-wrap gap-1.5 pt-1 @5xl:justify-end">{step.signals}</p>
              </div>
              <ScreenshotFrame
                shot={step.shot}
                crop={step.crop}
                focus={step.focus}
                sizes="(min-width: 80rem) 89rem, (min-width: 48rem) 110vw, 300vw"
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
