"use client";

import { ShipIcon } from "lucide-react";

import { ALL, FilterSelect, useUrlFilters } from "@/components/shared/url-filters";
import { Spinner } from "@/components/ui/spinner";
import { PRIORITIES, PRIORITY_LABELS } from "@/features/work-orders/domain";

const VIEW_ITEMS = {
  open: "Open (most urgent first)",
  mine: "Assigned to me",
  blocked: "Blocked",
  completed: "Completed",
  all: "All work orders",
};
const DEFAULT_VIEW = "open";
const PRIORITY_ITEMS = { [ALL]: "All priorities", ...PRIORITY_LABELS };

export function WorkOrderFilters({ vessels }: { vessels: { id: string; name: string }[] }) {
  const { searchParams, setParam, isPending } = useUrlFilters();
  const vesselItems = Object.fromEntries([[ALL, "All vessels"], ...vessels.map((v) => [v.id, v.name])]);

  return (
    <div className="grid grid-cols-2 items-center gap-2 md:flex" aria-busy={isPending}>
      <FilterSelect
        label="Show"
        items={VIEW_ITEMS}
        value={searchParams.get("view") ?? DEFAULT_VIEW}
        options={Object.keys(VIEW_ITEMS)}
        onChange={(value) => setParam("view", value === DEFAULT_VIEW ? "" : value)}
        className="col-span-2 md:w-56"
      />
      <FilterSelect
        label="Priority"
        items={PRIORITY_ITEMS}
        value={searchParams.get("priority") ?? ALL}
        options={[ALL, ...PRIORITIES]}
        onChange={(value) => setParam("priority", value)}
      />
      <FilterSelect
        label="Vessel"
        icon={<ShipIcon aria-hidden />}
        items={vesselItems}
        value={searchParams.get("vessel") ?? ALL}
        options={[ALL, ...vessels.map((v) => v.id)]}
        onChange={(value) => setParam("vessel", value)}
        className="md:w-56"
      />
      {isPending ? <Spinner className="hidden md:block" aria-label="Updating list" /> : null}
    </div>
  );
}
