"use client";

import { UserIcon } from "lucide-react";

import { ALL, FilterSelect, useUrlFilters } from "@/components/shared/url-filters";
import { Spinner } from "@/components/ui/spinner";
import { RECORD_TYPE_FILTER_LABELS } from "@/features/audit/domain";
import { auditLogParamsSchema, SYSTEM_ACTOR } from "@/features/audit/schemas";

const TYPE_ITEMS = { [ALL]: "All records", ...RECORD_TYPE_FILTER_LABELS };

/** A new filter starts from the newest page. */
const RESET = { clear: ["before"] } as const;

export function AuditFilters({ people }: { people: { id: string; name: string }[] }) {
  const { searchParams, setParam, isPending } = useUrlFilters();

  // The server filters by any well-formed id, including someone who has left: say so rather than "Everyone".
  const actor = auditLogParamsSchema.shape.actor.parse(searchParams.get("actor") ?? undefined);
  const unknown = actor && actor !== SYSTEM_ACTOR && !people.some((person) => person.id === actor) ? actor : null;

  const personItems = Object.fromEntries([
    [ALL, "Everyone"],
    ...people.map((person) => [person.id, person.name]),
    [SYSTEM_ACTOR, "System (seed data)"],
    ...(unknown ? [[unknown, "Former or unknown person"]] : []),
  ]);

  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-center gap-2 @xs:grid-cols-2 @3xl:flex" aria-busy={isPending}>
        <FilterSelect
          label="Record type"
          items={TYPE_ITEMS}
          value={searchParams.get("type") ?? ALL}
          options={Object.keys(TYPE_ITEMS)}
          onChange={(value) => setParam("type", value, RESET)}
          className="@3xl:w-56"
        />
        <FilterSelect
          label="Changed by"
          icon={<UserIcon aria-hidden />}
          items={personItems}
          value={actor ?? ALL}
          options={Object.keys(personItems)}
          onChange={(value) => setParam("actor", value, RESET)}
          className="@3xl:w-56"
        />
        {isPending ? <Spinner className="@xs:col-span-2 @3xl:col-span-1" aria-label="Updating log" /> : null}
      </div>
    </div>
  );
}
