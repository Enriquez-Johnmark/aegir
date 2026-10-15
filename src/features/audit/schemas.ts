import { z } from "zod";

import { RECORD_TYPE_SLUGS, type RecordTypeSlug } from "@/features/audit/domain";

/** The person filter's value for events with no actor (written by a trusted system context, i.e. the seed). */
export const SYSTEM_ACTOR = "system";

const recordTypeSlugs = Object.keys(RECORD_TYPE_SLUGS) as [RecordTypeSlug, ...RecordTypeSlug[]];

/**
 * Audit log filters and the page cursor come from the URL, so they are
 * untrusted; bad values fall back to defaults. `before` is the id of the last
 * event on the previous page (an event id, never a timestamp or offset).
 */
export const auditLogParamsSchema = z.object({
  type: z.enum(recordTypeSlugs).optional().catch(undefined),
  actor: z.union([z.literal(SYSTEM_ACTOR), z.uuid()]).optional().catch(undefined),
  before: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional().catch(undefined),
});

export type AuditLogParams = z.output<typeof auditLogParamsSchema>;
