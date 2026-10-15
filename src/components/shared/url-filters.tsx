"use client";

import { cn } from "cn";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { WRAPPING_SELECT_TRIGGER } from "@/components/shared/wrapping-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The "no filter" option value; selecting it removes the key from the URL. A
 * reserved token, so it can't collide with a real option such as an "all" view
 * (it did: "All work orders" / "All inspections" used to fall back to the default).
 */
export const ALL = "__all__";

/**
 * List filters live in the URL so results are shareable and the server does the
 * filtering. Returns the current params, a setter that replaces one key (in a
 * transition, without scrolling), and whether a navigation is pending. `clear`
 * drops keys that a new filter invalidates, such as a page cursor.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string, { clear = [] }: { clear?: readonly string[] } = {}) {
    const params = new URLSearchParams(searchParams);
    for (const stale of clear) {
      params.delete(stale);
    }
    if (value && value !== ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const search = params.toString();
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false }));
  }

  return { searchParams, setParam, isPending };
}

export function FilterSelect({
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
  // URL values are untrusted: show only a known option, otherwise the default (listed first).
  const current = options.includes(value) ? value : (options[0] ?? ALL);
  return (
    <Select items={items} value={current} onValueChange={(next) => onChange(String(next ?? ALL))}>
      <SelectTrigger aria-label={label} className={cn(WRAPPING_SELECT_TRIGGER, "w-full @3xl:w-44", className)}>
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
