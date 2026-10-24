import { cn } from "cn";
import { CheckIcon, MinusIcon } from "lucide-react";

import { SECTION_IDS } from "@/features/landing/links";

// What a buyer asks first (D-051). Both lists come from PRODUCT.md: the core
// workflows, and the explicit exclusions of this version. The icons stay neutral:
// "included" is not a status signal (DESIGN.md, The Signal Rule).
const IN_THIS_VERSION = [
  "Vessels and a watch list that puts the ones needing attention first",
  "Inspections with checklists, findings and severities",
  "Work orders raised from failed checks, with a reason whenever work is blocked",
  "Shift handovers that the recipient acknowledges",
  "A dashboard of what's overdue, blocked and waiting",
  "A complete history of every change",
  "Works on a phone, a tablet and a desktop browser",
] as const;

const NOT_YET = [
  "Photo and file attachments",
  "Email or push notifications",
  "Exports and reports",
  "Offline use at sea, or native mobile apps",
  "Self-service sign-up, single sign-on or two-factor sign-in",
  "Screens to manage users and companies (the demo's are set up for you)",
] as const;

export function ScopeSection() {
  return (
    <section aria-labelledby={`${SECTION_IDS.scope}-title`} id={SECTION_IDS.scope} className="@container scroll-mt-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-20 sm:px-8 lg:py-28">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2
            id={`${SECTION_IDS.scope}-title`}
            className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
          >
            What it replaces, and what it doesn&apos;t do yet
          </h2>
          <p className="text-lg/relaxed text-pretty text-muted-foreground">
            Instead of findings scattered across spreadsheets, email threads and paper checklists: one record per
            finding, from the failed check to the finished work.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-10 @3xl:grid-cols-2 @3xl:gap-16">
          <ScopeList title="In this version" items={IN_THIS_VERSION} icon={CheckIcon} iconClassName="text-foreground" />
          <ScopeList title="Not in this version" items={NOT_YET} icon={MinusIcon} iconClassName="text-muted-foreground" />
        </div>
        <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
          The checklists are examples, not official templates. Aegir is a portfolio project with synthetic data and
          is not certified for the ISM Code, SOLAS, flag-state or class requirements.
        </p>
      </div>
    </section>
  );
}

function ScopeList({
  title,
  items,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  items: readonly string[];
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconClassName: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold">{title}</h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 text-pretty">
            <Icon aria-hidden className={cn("mt-1 size-4", iconClassName)} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
