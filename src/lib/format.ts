const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat("en-GB");

/** "12 Oct 2026". Accepts ISO dates ("2026-10-12") and timestamps. */
export function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return dateFormatter.format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}

export function formatNumber(value: number | null): string {
  return value === null ? "—" : numberFormatter.format(value);
}

/** Today's date as YYYY-MM-DD (UTC), for comparing against `date` columns. */
export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

/** "15 Oct 2026, 08:58 UTC". For timestamps where the time matters (shift handovers). */
export function formatDateTime(value: string | null): string {
  return value ? `${dateTimeFormatter.format(new Date(value))} UTC` : "—";
}
