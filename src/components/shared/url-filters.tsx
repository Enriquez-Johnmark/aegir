"use client";

import { cn } from "cn";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The "no filter" option value; selecting it removes the key from the URL. */
export const ALL = "all";

/**
 * List filters live in the URL so results are shareable and the server does the
 * filtering. Returns the current params, a setter that replaces one key (in a
 * transition, without scrolling), and whether a navigation is pending.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
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
  return (
    <Select items={items} value={value} onValueChange={(next) => onChange(String(next ?? ALL))}>
      <SelectTrigger aria-label={label} className={cn(
        // A long value wraps instead of being clipped when text is enlarged (WCAG 1.4.4).
        // Plain min-h-8 (not a data-attribute variant) so the trigger's pointer-coarse:min-h-11 still wins on touch.
        "min-h-8 w-full py-1 text-left whitespace-normal data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none @3xl:w-44",
        className,
      )}>
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
