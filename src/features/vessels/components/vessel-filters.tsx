"use client";

import { ArrowDownUpIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  VESSEL_STATUS_LABELS,
  VESSEL_STATUSES,
  VESSEL_TYPE_LABELS,
  VESSEL_TYPES,
} from "@/features/vessels/domain";

const ALL = "all";

const STATUS_ITEMS = { [ALL]: "All statuses", ...VESSEL_STATUS_LABELS };
const TYPE_ITEMS = { [ALL]: "All types", ...VESSEL_TYPE_LABELS };
const SORT_ITEMS = {
  attention: "Attention first",
  name: "Name A–Z",
  recent: "Recently updated",
  year: "Newest build year",
};
const DEFAULT_SORT = "attention";

/** Filters live in the URL so results are shareable and the server does the filtering. */
export function VesselFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
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

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const search = params.toString();
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false }));
  }

  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPushedQuery(value.trim());
      update("q", value.trim());
    }, 300);
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center" aria-busy={isPending}>
      <InputGroup className="md:max-w-xs">
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
      <div className="grid grid-cols-2 gap-2 md:flex">
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
          className="col-span-2"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  icon,
  items,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  items: Record<string, string>;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select items={items} value={value} onValueChange={(next) => onChange(String(next ?? ALL))}>
      <SelectTrigger aria-label={label} className={cn("w-full md:w-44", className)}>
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {items[option]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
