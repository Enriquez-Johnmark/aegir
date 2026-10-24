import { ButtonLink } from "@/components/shared/button-link";
import {
  DEMO_ACCOUNTS,
  DEMO_ROLES,
  demoRoleLabel,
  demoSignInHref,
} from "@/features/auth/demo-accounts";
import { SECTION_IDS } from "@/features/landing/links";

/** Every published account, a first task built on its own seeded work, and a way in (D-051). */
export function DemoAccounts() {
  return (
    <section aria-labelledby={`${SECTION_IDS.demo}-title`} id={SECTION_IDS.demo} className="scroll-mt-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 sm:px-8 lg:py-28">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2
            id={`${SECTION_IDS.demo}-title`}
            className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
          >
            Try it as each role
          </h2>
          <p className="text-lg/relaxed text-pretty text-muted-foreground">
            Four people at Northwind Shipping, a made-up company with synthetic data. Each link opens sign-in with
            their account filled in and the password shown. Here is a first thing to try as each.
          </p>
        </div>
        <ul className="@container flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {DEMO_ROLES.map((role) => {
            const account = DEMO_ACCOUNTS[role];
            return (
              <li
                key={role}
                className="grid gap-3 border-t px-4 py-5 first:border-t-0 @3xl:grid-cols-[12rem_minmax(0,1fr)_auto] @3xl:items-center @3xl:gap-8 @3xl:px-6"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{demoRoleLabel(role)}</span>
                  <span className="text-sm text-muted-foreground">{account.name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-pretty">{account.tryThis}</p>
                  <p className="font-mono text-[0.8125rem] break-all text-muted-foreground">{account.email}</p>
                </div>
                <ButtonLink
                  href={demoSignInHref(role)}
                  variant={role === "manager" ? "default" : "outline"}
                  className="w-fit"
                >
                  Sign in as {account.name.split(" ")[0]}
                </ButtonLink>
              </li>
            );
          })}
        </ul>
        <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
          Safety records can&apos;t be deleted, by design, so you may find other visitors&apos; work in the demo. The
          administrator account isn&apos;t published.
        </p>
      </div>
    </section>
  );
}
