import { ArrowUpRightIcon } from "lucide-react";

import { ButtonLink } from "@/components/shared/button-link";
import { AUTHOR, SECTION_IDS } from "@/features/landing/links";

/**
 * The page's close, for clients (D-051): the night field again, bookending the hero,
 * with one action. It promises a conversation, not a product for sale: Aegir is a
 * portfolio project, and the copy says so.
 */
export function ContactSection() {
  return (
    <section
      aria-labelledby={`${SECTION_IDS.contact}-title`}
      id={SECTION_IDS.contact}
      className="dark night scroll-mt-4 bg-background text-foreground"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 sm:px-8 lg:py-24">
        <h2
          id={`${SECTION_IDS.contact}-title`}
          className="max-w-3xl text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
        >
          Want this for your fleet?
        </h2>
        <p className="max-w-2xl text-lg/relaxed text-pretty text-muted-foreground">
          Aegir is a working demonstration built by {AUTHOR.name} with synthetic data. If your crews need something
          like it, shaped around how they actually work, let&apos;s talk.
        </p>
        <ButtonLink href={AUTHOR.linkedin} size="lg" className="h-auto min-h-11 max-w-full px-4 py-2 text-base whitespace-normal">
          Talk to {AUTHOR.name.split(" ")[0]} on LinkedIn
          <ArrowUpRightIcon data-icon="inline-end" />
        </ButtonLink>
      </div>
    </section>
  );
}
