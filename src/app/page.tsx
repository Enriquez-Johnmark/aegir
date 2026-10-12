import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Aegir</h1>
        <p className="max-w-md text-muted-foreground">
          Maritime safety and fleet operations management: vessels, inspections, work orders and
          handovers in one audited workspace.
        </p>
      </div>
      <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
        Sign in
      </Button>
    </main>
  );
}
