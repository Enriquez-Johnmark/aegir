import type { Metadata } from "next";

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
};

// The public landing page (Impeccable Persuade surface, D-024, D-046). Fully static:
// no session or database reads, so it prerenders.
export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <HowItWorks />
        <TrustSection />
        <DemoAccounts />
      </main>
      <LandingFooter />
    </>
  );
}
