import type { Metadata } from "next";

import { AuthorSection } from "@/features/landing/components/author-section";
import { BuiltSection } from "@/features/landing/components/built-section";
import { DemoAccounts } from "@/features/landing/components/demo-accounts";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { LandingHeader } from "@/features/landing/components/landing-header";
import { LandingHero } from "@/features/landing/components/landing-hero";
import { TrustSection } from "@/features/landing/components/trust-section";

export const metadata: Metadata = {
  title: { absolute: "Aegir: maritime safety and fleet operations" },
  description:
    "Vessels, safety inspections, work orders and shift handovers in one audited workspace. Try the live demo as a fleet manager, inspector, technician or viewer.",
  // The image comes from app/opengraph-image.tsx (D-050).
  openGraph: {
    type: "website",
    siteName: "Aegir",
    title: "Aegir: maritime safety and fleet operations",
    description:
      "Every failed check stays in sight until the work is done. A portfolio project by Johnmark Enriquez: Next.js 16, Postgres with row-level security, a live demo.",
  },
  twitter: { card: "summary_large_image" },
};

// The public landing page (Impeccable Persuade surface, D-024, D-046), for people who
// run fleets and people who are hiring (D-050). Fully static: no session or database
// reads, so it prerenders.
export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <HowItWorks />
        <TrustSection />
        <BuiltSection />
        <DemoAccounts />
        <AuthorSection />
      </main>
      <LandingFooter />
    </>
  );
}
