import { PhoneFrame } from "@/features/landing/components/phone-frame";
import { SECTION_IDS } from "@/features/landing/links";
import { SCREENSHOTS } from "@/features/landing/screenshots";

// Where each role works and what Aegir does for them there. Every line is a feature
// the demo has (PRODUCT.md, Core workflows; DESIGN.md, The Deck Hand Rule).
const ROLES = [
  {
    role: "Safety inspector",
    where: "On deck, on a phone",
    does: "Records each check where it is. Every control is at least 44px tall, and a failure can't be saved without a finding and a severity.",
  },
  {
    role: "Technician",
    where: "Between jobs",
    does: "Sees the jobs assigned to them, starts one, blocks it with a reason when a part is missing, and hands what's left to the next shift.",
  },
  {
    role: "Fleet manager",
    where: "At the desk, or anywhere",
    does: "Sees critical, blocked and overdue work first across the fleet, then assigns it and sets priorities and due dates.",
  },
  {
    role: "Auditor or stakeholder",
    where: "Read-only",
    does: "Follows everything, including who changed what and when, and can't change anything.",
  },
] as const;

/** Who uses Aegir, and where (D-051). */
export function RolesSection() {
  return (
    <section aria-labelledby={`${SECTION_IDS.roles}-title`} id={SECTION_IDS.roles} className="@container scroll-mt-4 border-t">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-20 sm:px-8 lg:py-28 @5xl:grid-cols-[minmax(0,1fr)_20rem] @5xl:gap-16">
        <div className="flex flex-col gap-10">
          <div className="flex max-w-2xl flex-col gap-4">
            <h2
              id={`${SECTION_IDS.roles}-title`}
              className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
            >
              On deck and at the desk
            </h2>
            <p className="text-lg/relaxed text-pretty text-muted-foreground">
              One shared record for everyone who touches a finding, each on the screen that suits where they work.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-x-10 gap-y-8 @3xl:grid-cols-2">
            {ROLES.map(({ role, where, does }) => (
              <div key={role} className="flex flex-col gap-1.5 border-t pt-4">
                <dt className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{role}</span>
                  <span className="text-sm text-muted-foreground">{where}</span>
                </dt>
                <dd className="text-pretty text-muted-foreground">{does}</dd>
              </div>
            ))}
          </dl>
        </div>
        <figure className="flex flex-col items-center gap-3 @5xl:items-start">
          <PhoneFrame shot={SCREENSHOTS.phoneDashboard} crop={{ top: 0, height: 0.62 }} />
          <figcaption className="text-sm text-muted-foreground">The manager&apos;s dashboard on a phone.</figcaption>
        </figure>
      </div>
    </section>
  );
}
