import { SECTION_IDS, blobUrl } from "@/features/landing/links";

const tests = (file: string) => ({ file, href: blobUrl(`supabase/tests/${file}`) });

// The promises on `/` (TrustSection), each with what enforces it and the pgTAP files
// that prove it (D-051). Mechanisms: SECURITY.md §3–§5, DATA_MODEL.md; no migration
// grants DELETE to a client role.
const GUARANTEES = [
  {
    promise: "Your company's records stay yours",
    enforcedBy:
      "Row-level security on every table, through membership checks in a private schema. Child rows must belong to their parent's company, and the company is never taken from the client.",
    proof: [tests("01_tenancy.test.sql"), tests("12_read_isolation.test.sql")],
  },
  {
    promise: "Every change is signed and dated",
    enforcedBy:
      "Triggers record inserts, updates and deletes on every audited table, with the actor taken from the session. No client role may insert, update or delete an audit row.",
    proof: [tests("06_audit.test.sql"), tests("10_audit_log_access.test.sql")],
  },
  {
    promise: "The rules can't be skipped",
    enforcedBy:
      "Triggers allow only valid status changes and limit which columns each role may change. No client role has delete rights on any table.",
    proof: [tests("03_inspections.test.sql"), tests("04_work_orders.test.sql"), tests("08_linked_failed_checks.test.sql")],
  },
  {
    promise: "Handovers can't be rewritten",
    enforcedBy:
      "A trigger allows one change to a sent handover: the recipient acknowledging it, which stamps the time. The sender can't be forged.",
    proof: [tests("05_handovers.test.sql"), tests("09_handover_access.test.sql")],
  },
] as const;

/** Each promise on the product page, what enforces it, and the test that proves it. */
export function GuaranteesSection() {
  return (
    <section
      aria-labelledby={`${SECTION_IDS.guarantees}-title`}
      id={SECTION_IDS.guarantees}
      className="@container scroll-mt-4"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 sm:px-8 lg:py-24">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2
            id={`${SECTION_IDS.guarantees}-title`}
            className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
          >
            The promises, and what keeps them
          </h2>
          <p className="text-lg/relaxed text-pretty text-muted-foreground">
            Each promise on the product page is enforced by Postgres, not only by the screens, and each has pgTAP
            tests that try to break it.
          </p>
        </div>
        <dl className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {GUARANTEES.map(({ promise, enforcedBy, proof }) => (
            <div
              key={promise}
              className="grid gap-2 border-t p-4 first:border-t-0 @3xl:grid-cols-[14rem_minmax(0,1fr)_17rem] @3xl:gap-8 @3xl:px-6"
            >
              <dt className="font-medium">{promise}</dt>
              <dd className="text-pretty text-muted-foreground">{enforcedBy}</dd>
              <dd className="flex flex-col">
                <span className="sr-only">Proved by</span>
                {proof.map(({ file, href }) => (
                  <a
                    key={file}
                    href={href}
                    className="inline-flex min-h-6 w-fit items-center font-mono text-[0.8125rem] break-all text-primary underline-offset-4 hover:underline pointer-coarse:min-h-11"
                  >
                    {file}
                  </a>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
