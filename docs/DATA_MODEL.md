# Data Model

> **Status: implemented (M2, 2026-10-12)** in `supabase/migrations/`, verified by 73 pgTAP tests (`supabase/tests/`). Conventions: [CONVENTIONS.md §4](CONVENTIONS.md#4-database-and-migrations-postgres).

| Migration | Contents |
|---|---|
| `20261012070232_create_tenancy.sql` | Default-privilege hardening, `private` schema, `org_role`, organizations, profiles (+ new-user trigger), memberships, RLS helper functions |
| `20261012070234_create_vessels.sql` | `vessel_type`, `vessel_status`, IMO validation, vessels |
| `20261012070235_create_inspections.sql` | `inspection_status`, `check_result`, `severity`, inspections, inspection_items, transition/freeze triggers, `create_inspection` RPC |
| `20261012070237_create_work_orders.sql` | `work_order_status`, work_orders, transition and assignee rules |
| `20261012070238_create_handovers.sql` | `handover_status`, handovers, immutability and acknowledgement rules |
| `20261012070240_create_audit_log.sql` | audit_events + audit triggers on every operational table |
| `20261014174645_require_inspector_role_for_item_updates.sql` | Fix forward: the assigned-inspector branch of the `inspection_items` update policy also requires a current `inspector` role (D-031) |
| `20261015051635_protect_linked_failed_checks.sql` | A failed check that a work order references can no longer change its result (`inspection_items_protect_linked_failure` trigger, D-037) |

## 1. Entity relationships

```text
auth.users 1─1 profiles
profiles   1─* memberships *─1 organizations
organizations 1─* vessels
vessels       1─* inspections 1─* inspection_items
vessels       1─* work_orders *─0..1 inspection_items   (work order raised from a failed check)
vessels/work_orders 0..1─* handovers
(all organization tables) ──trigger──▶ audit_events (append-only)
```

Every organization-owned table carries `organization_id`. Child → parent references use **composite FKs** `(parent_id, organization_id)` so cross-organization links are impossible at the database level. Every parent therefore has `unique (id, organization_id)`.

## 2. Enums

| Type | Values |
|---|---|
| `org_role` | `admin`, `manager`, `inspector`, `technician`, `viewer` |
| `vessel_type` | `bulk_carrier`, `tanker`, `container`, `general_cargo`, `offshore_support`, `passenger`, `tug`, `other` |
| `vessel_status` | `active`, `in_maintenance`, `laid_up`, `decommissioned` |
| `inspection_status` | `scheduled`, `in_progress`, `completed`, `cancelled` |
| `check_result` | `pending`, `pass`, `fail`, `not_applicable` |
| `severity` | `low`, `medium`, `high`, `critical` (finding severity and work-order priority) |
| `work_order_status` | `open`, `in_progress`, `blocked`, `completed` |
| `handover_status` | `pending`, `acknowledged` |

## 3. Tables

Unless noted otherwise: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()` (maintained by a trigger) on mutable tables.

### organizations
| Column | Type | Constraints |
|---|---|---|
| name | text | not null, `char_length between 2 and 120` |
| slug | text | not null, unique, `~ '^[a-z0-9-]{2,60}$'` |

### profiles (1:1 with `auth.users`)
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, FK → `auth.users(id)` **on delete cascade** |
| full_name | text | not null, `char_length between 1 and 120` |

Created automatically by an `after insert on auth.users` trigger (`private.handle_new_user`, security definer). It reads `full_name` from `raw_user_meta_data` **for display only**, never for authorization.

### memberships
| Column | Type | Constraints |
|---|---|---|
| organization_id | uuid | FK → organizations **restrict**, indexed |
| user_id | uuid | FK → profiles **cascade**, indexed |
| role | org_role | not null |
| | | `unique (organization_id, user_id)` |

### vessels
| Column | Type | Constraints |
|---|---|---|
| organization_id | uuid | FK → organizations restrict, indexed |
| name | text | not null, 1–120 chars |
| imo_number | text | not null, `private.is_valid_imo()`: 7 digits **with a valid IMO check digit**; `unique (organization_id, imo_number)` |
| vessel_type | vessel_type | not null |
| flag_state | text | not null, 2–60 chars |
| status | vessel_status | not null default `active` |
| year_built | integer | null, `between 1900 and 2100` (the "not in the future" rule lives in the Zod schema) |
| gross_tonnage | integer | null, `> 0` |
| created_by | uuid | FK → profiles **set null** |
| | | `unique (id, organization_id)` (composite FK target) |

Indexes: `(organization_id, status)`, `(created_by)`; `organization_id` lookups use the `(organization_id, imo_number)` unique index.

### inspections
| Column | Type | Constraints |
|---|---|---|
| organization_id | uuid | not null |
| vessel_id | uuid | composite FK `(vessel_id, organization_id)` → vessels **restrict** |
| inspector_id | uuid | FK → profiles set null |
| title | text | not null |
| status | inspection_status | not null default `scheduled` |
| scheduled_for | date | not null |
| completed_at | timestamptz | `(status = 'completed') = (completed_at is not null)` |
| notes | text | null |
| | | `unique (id, organization_id)` |

Derived (in a view or query, not stored): `is_overdue = status in ('scheduled','in_progress') and scheduled_for < current_date`; `requires_follow_up = exists failed item without a linked work order`.
Indexes: `(organization_id, status, scheduled_for)`, `(vessel_id, organization_id)` (covers the composite FK), `(inspector_id)`, `(created_by)`.
Inspector must be a member with role admin/manager/inspector (trigger). `completed_at` is set by the trigger, never by clients.
Transitions (trigger): `scheduled → in_progress | cancelled`, `in_progress → completed | cancelled`. `completed` and `cancelled` are terminal. An inspection can only be completed when **no item is `pending`**.

### inspection_items
| Column | Type | Constraints |
|---|---|---|
| organization_id | uuid | not null |
| inspection_id | uuid | composite FK → inspections **restrict**, indexed |
| position | integer | not null, `>= 1`, `unique (inspection_id, position)` |
| category | text | not null (e.g. "Fire safety", "Life-saving appliances") |
| description | text | not null |
| result | check_result | not null default `pending` |
| finding | text | `result = 'fail'` ⇒ not null |
| severity | severity | `result = 'fail'` ⇔ not null |
| | | `unique (id, organization_id)` |

Items are **frozen once the parent inspection is completed or cancelled** (trigger). Changing a result away from `fail` clears `severity` automatically. **A failed item that a work order references keeps `result = 'fail'`** (P0001, D-037); its finding and severity can still be refined while the inspection is open.
Indexes: `(inspection_id, organization_id)` (composite FK), `(organization_id, result)`; `(inspection_id, position)` unique.

### work_orders
| Column | Type | Constraints |
|---|---|---|
| organization_id | uuid | not null |
| vessel_id | uuid | composite FK → vessels restrict, indexed |
| inspection_item_id | uuid | null, composite FK → inspection_items restrict, indexed |
| title | text | not null, 3–160 chars |
| description | text | null |
| priority | severity | not null default `medium` |
| status | work_order_status | not null default `open` |
| assignee_id | uuid | FK → profiles set null, indexed |
| due_date | date | null |
| blocked_reason | text | `status = 'blocked'` ⇔ not null |
| completed_at | timestamptz | `status = 'completed'` ⇔ not null |
| created_by | uuid | FK → profiles set null |
| | | `unique (id, organization_id)` |

Overdue (derived): `status <> 'completed' and due_date < current_date`.
Indexes: `(organization_id, status, due_date)`, `(vessel_id, organization_id)`, `(inspection_item_id, organization_id)`, `(assignee_id)`, `(created_by)`.
Rules (trigger): a work order raised from a checklist item requires that item to be `fail` **and** on the same vessel (an item from another organization is invisible and reported as "not found"); the assignee must be a non-viewer member; leaving `blocked` clears `blocked_reason`; `completed_at` is set on completion; users who are not admin/manager may change only `status`/`blocked_reason` (and only on work orders assigned to them, via RLS).
Transitions (trigger, mirrored in `features/work-orders/domain.ts`):

| From \ To | open | in_progress | blocked | completed |
|---|---|---|---|---|
| open | – | ✓ | ✓ | ✗ |
| in_progress | ✓ | – | ✓ | ✓ |
| blocked | ✓ | ✓ | – | ✗ |
| completed | ✗ | ✗ | ✗ | – (terminal) |

### handovers
| Column | Type | Constraints |
|---|---|---|
| organization_id | uuid | not null |
| vessel_id | uuid | null, composite FK → vessels restrict |
| work_order_id | uuid | null, composite FK → work_orders restrict |
| from_user_id | uuid | not null, FK → profiles restrict; **must equal `auth.uid()` on insert** (RLS `with check`) |
| to_user_id | uuid | not null, FK → profiles restrict; `<> from_user_id` |
| summary | text | not null |
| outstanding_tasks | text | not null |
| status | handover_status | not null default `pending` |
| acknowledged_at | timestamptz | `status = 'acknowledged'` ⇔ not null |
| | | at least one of `vessel_id`, `work_order_id` not null |

Rules: `from_user_id` is always set to the acting user by trigger. The recipient must be a non-viewer member. When only `work_order_id` is given, `vessel_id` is copied from the work order (and must match if both are given). After insert, **content is immutable** (only `status` is updatable, by column grant). The only allowed update is `pending → acknowledged`, by `to_user_id` (RLS), which stamps `acknowledged_at`. Corrections are made by creating a new handover, so history is never silently overwritten.

### audit_events (append-only)
| Column | Type | Constraints |
|---|---|---|
| id | bigint | `generated always as identity` PK (high-volume, append-only, never exposed in URLs) |
| organization_id | uuid | not null, FK → organizations restrict |
| actor_id | uuid | null (no FK, so history survives user deletion; null = system) |
| entity_type | text | not null (table name) |
| entity_id | uuid | not null |
| action | text | `in ('insert','update','status_change')` |
| changes | jsonb | not null default `'{}'`: changed columns only, as `{column: {old, new}}` |
| occurred_at | timestamptz | not null default now() |

Written **only** by `private.record_audit_event()` (security definer `after insert or update` trigger on memberships, vessels, inspections, inspection_items, work_orders and handovers). `actor_id` comes from `auth.uid()` inside the trigger, so it cannot be forged. Insert events store a snapshot of the new row; updates store only changed columns; no-op updates are not recorded. `authenticated` gets SELECT only, with **no** insert, update or delete grants or policies.
Indexes: `(organization_id, occurred_at desc)`, `(entity_type, entity_id, occurred_at desc)`.

## 4. Data lifecycle and retention

| Data | Deletion behaviour |
|---|---|
| organizations | Not deletable by users. FKs `restrict`. |
| vessels | No DELETE policy. Retire with `status = 'decommissioned'`. |
| inspections, items, work orders, handovers | No DELETE policy. Cancel or complete instead. Kept for history. |
| audit_events | Immutable. No UPDATE or DELETE for any app role. |
| profiles / memberships | Removing an auth user cascades to the profile and memberships. Authored records keep their history (`created_by`/`assignee_id` set to null, `actor_id` kept). Handover user FKs are `restrict`, so a user with handovers must be deactivated (membership removed), not deleted. |

## 5. Atomic operations (RPC)

| Function | Purpose |
|---|---|
| `public.create_inspection(p_vessel_id, p_title, p_scheduled_for, p_inspector_id, p_notes, p_items jsonb)` ✅ | Inserts the inspection and 1–100 checklist items (`[{category, description}]`) in one transaction. `security invoker`, so RLS applies; the organization is derived from the (RLS-visible) vessel, never from client input. |

Raising a work order from a failed item is a single insert (`inspection_item_id` set); the trigger validates it, so no RPC is needed.

## 5a. Privileges (column-level grants)

Clients can only write the columns listed below (everything else is set by defaults or triggers, or is immutable):

| Table | INSERT columns | UPDATE columns |
|---|---|---|
| profiles | — (trigger) | `full_name` (own row) |
| vessels | organization_id, name, imo_number, vessel_type, flag_state, status, year_built, gross_tonnage | same minus organization_id |
| inspections | organization_id, vessel_id, inspector_id, title, scheduled_for, notes | inspector_id, title, status, scheduled_for, notes |
| inspection_items | organization_id, inspection_id, position, category, description | result, finding, severity |
| work_orders | organization_id, vessel_id, inspection_item_id, title, description, priority, assignee_id, due_date | title, description, priority, status, assignee_id, due_date, blocked_reason |
| handovers | organization_id, vessel_id, work_order_id, to_user_id, summary, outstanding_tasks | status |
| organizations, memberships, audit_events | — | — |

No table grants DELETE to any app role. `anon` has no privileges at all.

## 6. Primary-key choice

UUID v4 (`gen_random_uuid()`) for entity tables, `bigint identity` for `audit_events`. See [DECISIONS.md D-004](DECISIONS.md#d-004).
