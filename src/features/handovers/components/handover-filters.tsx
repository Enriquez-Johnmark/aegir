"use client";

import { ShipIcon } from "lucide-react";

import { ALL, FilterSelect, useUrlFilters } from "@/components/shared/url-filters";
import { Spinner } from "@/components/ui/spinner";

const VIEW_ITEMS = {
  pending: "Pending (yours first)",
  "for-you": "Waiting for you",
  sent: "Sent by you",
  acknowledged: "Acknowledged",
  all: "All handovers",
};
const DEFAULT_VIEW = "pending";

export function HandoverFilters({ vessels }: { vessels: { id: string; name: string }[] }) {
  const { searchParams, setParam, isPending } = useUrlFilters();
  const vesselItems = Object.fromEntries([[ALL, "All vessels"], ...vessels.map((v) => [v.id, v.name])]);

  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-center gap-2 @xs:grid-cols-2 @3xl:flex" aria-busy={isPending}>
        <FilterSelect
          label="Show"
          items={VIEW_ITEMS}
          value={searchParams.get("view") ?? DEFAULT_VIEW}
          options={Object.keys(VIEW_ITEMS)}
          onChange={(value) => setParam("view", value === DEFAULT_VIEW ? "" : value)}
          className="@3xl:w-56"
        />
        <FilterSelect
          label="Vessel"
          icon={<ShipIcon aria-hidden />}
          items={vesselItems}
          value={searchParams.get("vessel") ?? ALL}
          options={[ALL, ...vessels.map((v) => v.id)]}
          onChange={(value) => setParam("vessel", value)}
          className="@3xl:w-56"
        />
        {isPending ? <Spinner className="hidden @3xl:block" aria-label="Updating list" /> : null}
      </div>
    </div>
  );
}
