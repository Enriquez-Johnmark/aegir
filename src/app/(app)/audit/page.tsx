import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditLog } from "@/features/audit/components/audit-log";
import { auditLogParamsSchema } from "@/features/audit/schemas";
import { listAuditPeople } from "@/features/audit/server/queries";

export const metadata: Metadata = {
  title: "Audit log",
};

export default function AuditPage({ searchParams }: PageProps<"/audit">) {
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change in your organization, recorded by the database as it happens. Entries can't be edited or deleted. Times are UTC."
      />
      {/* Filters are 44px tall on touch screens and 32px from md up. */}
      <Suspense fallback={<Skeleton className="h-11 md:h-8 md:max-w-xl" />}>
        <Filters />
      </Suspense>
      <Suspense fallback={<LogSkeleton />}>
        <FilteredAuditLog searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Filters() {
  const people = await listAuditPeople();
  return <AuditFilters people={people} />;
}

async function FilteredAuditLog({ searchParams }: Pick<PageProps<"/audit">, "searchParams">) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const params = auditLogParamsSchema.parse({ type: first(raw.type), actor: first(raw.actor), before: first(raw.before) });
  return <AuditLog params={params} />;
}

function LogSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
