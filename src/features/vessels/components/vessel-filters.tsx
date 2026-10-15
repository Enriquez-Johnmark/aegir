"use client";

import { ArrowDownUpIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ALL, FilterSelect, useUrlFilters } from "@/components/shared/url-filters";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  VESSEL_STATUS_LABELS,
  VESSEL_STATUSES,
  VESSEL_TYPE_LABELS,
  VESSEL_TYPES,
} from "@/features/vessels/domain";

const STATUS_ITEMS = { [ALL]: "All statuses", ...VESSEL_STATUS_LABELS };
const TYPE_ITEMS = { [ALL]: "All types", ...VESSEL_TYPE_LABELS };
const SORT_ITEMS = {
  attention: "Attention first",
  name: "Name A–Z",
  recent: "Recently updated",
  year: "Newest build year",
};
const DEFAULT_SORT = "attention";

export function VesselFilters() {
  const { searchParams, setParam: update, isPending } = useUrlFilters();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  // The last q this component pushed. When the URL's q differs from it, the change
  // came from outside (e.g. "Clear filters"), so the box re-syncs. Adjusting state
  // during render (not in an effect) avoids a stale value flashing.
  const [pushedQuery, setPushedQuery] = useState(urlQuery);
  if (urlQuery !== pushedQuery) {
    setPushedQuery(urlQuery);
    setQuery(urlQuery);
  }
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(debounce.current), []);

  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPushedQuery(value.trim());
      update("q", value.trim());
    }, 300);
  }

  return (
    <div className="@container">
      <div className="flex flex-col gap-2 @3xl:flex-row @3xl:items-center" aria-busy={isPending}>
        <InputGroup className="@3xl:max-w-xs">
          <InputGroupAddon>
            {isPending ? <Spinner /> : <SearchIcon />}
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search name or IMO"
            aria-label="Search vessels by name or IMO number"
          />
        </InputGroup>
        <div className="grid grid-cols-1 gap-2 @xs:grid-cols-2 @3xl:flex">
          <FilterSelect
            label="Status"
            items={STATUS_ITEMS}
            value={searchParams.get("status") ?? ALL}
            options={[ALL, ...VESSEL_STATUSES]}
            onChange={(value) => update("status", value)}
          />
          <FilterSelect
            label="Type"
            items={TYPE_ITEMS}
            value={searchParams.get("type") ?? ALL}
            options={[ALL, ...VESSEL_TYPES]}
            onChange={(value) => update("type", value)}
          />
          <FilterSelect
            label="Sort"
            icon={<ArrowDownUpIcon aria-hidden />}
            items={SORT_ITEMS}
            value={searchParams.get("sort") ?? DEFAULT_SORT}
            options={["attention", "name", "recent", "year"]}
            onChange={(value) => update("sort", value === DEFAULT_SORT ? "" : value)}
            className="@xs:col-span-2"
          />
        </div>
      </div>
    </div>
  );
}
