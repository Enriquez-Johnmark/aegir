import type { Metadata } from "next";

import { AuthorSection } from "@/features/landing/components/author-section";
import { BuiltSection } from "@/features/landing/components/built-section";
import { GuaranteesSection } from "@/features/landing/components/guarantees-section";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { LandingHeader } from "@/features/landing/components/landing-header";
import { AUTHOR, SOURCE_LINKS } from "@/features/landing/links";

export const metadata: Metadata = {
  title: "How it's built",
  description:
    "How Aegir is built and checked: Next.js 16 and Postgres with row-level security, the database rules behind each promise, and the tests that prove them. By Johnmark Enriquez.",
};

// The engineering page (D-051): what the product page promises, and how it is kept.
// For engineers and people who are hiring, so the product page can stay with the
// people who would use Aegir. Static, like `/`.
export default function EngineeringPage() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <section aria-labelledby="engineering-title" className="dark night bg-background text-foreground">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-14 pb-16 sm:px-8 lg:pt-20 lg:pb-20">
            <h1
              id="engineering-title"
              className="max-w-3xl text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
            >
              How Aegir is built
            </h1>
            <p className="max-w-2xl text-lg/relaxed text-pretty text-muted-foreground">
              The product page makes four promises about safety records. This page shows what keeps each one, how a
              request travels, and the tests that run on every push.
            </p>
            <p className="text-sm text-muted-foreground">
              Built by <span className="font-medium text-foreground">{AUTHOR.name}</span>, {AUTHOR.title.toLowerCase()}.{" "}
              <a href={SOURCE_LINKS.repository} className="font-medium text-primary underline-offset-4 hover:underline">
                Read the source
              </a>
              .
            </p>
          </div>
        </section>
        <GuaranteesSection />
        <BuiltSection />
        <AuthorSection />
      </main>
      <LandingFooter />
    </>
  );
}
