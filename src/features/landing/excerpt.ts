// The real code quoted in "How it's built" (D-050): one database rule and the pgTAP
// test that proves it. excerpt.test.ts checks every quote against its file, so a
// change to either file fails the unit tests instead of leaving a stale quote.

import { blobUrl } from "@/features/landing/links";

export type Excerpt = {
  path: string;
  /** First and last quoted line, 1-based, inclusive. */
  lines: readonly [number, number];
  /** Leading spaces removed from every quoted line. */
  dedent: number;
  code: string;
};

export const RULE_EXCERPT: Excerpt = {
  path: "supabase/migrations/20261016000517_harden_after_independent_review.sql",
  lines: [229, 237],
  dedent: 2,
  code: `if new.status is distinct from old.status then
  if not (
    (old.status = 'open' and new.status in ('in_progress', 'blocked'))
    or (old.status = 'in_progress' and new.status in ('open', 'blocked', 'completed'))
    or (old.status = 'blocked' and new.status in ('open', 'in_progress'))
  ) then
    raise exception 'Invalid work order status change: % -> %', old.status, new.status
      using errcode = 'P0001';
  end if;`,
};

export const TEST_EXCERPT: Excerpt = {
  path: "supabase/tests/04_work_orders.test.sql",
  lines: [53, 57],
  dedent: 0,
  code: `select throws_ok(
  $$ update public.work_orders set status = 'completed' where id = 'a4000000-0000-4000-8000-000000000003' $$,
  'P0001', 'Invalid work order status change: open -> completed',
  'open -> completed is not a valid transition'
);`,
};

export function excerptHref({ path, lines: [first, last] }: Excerpt): string {
  return `${blobUrl(path)}#L${first}-L${last}`;
}
