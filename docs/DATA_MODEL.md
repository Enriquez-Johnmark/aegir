# Data Model

> **Status: design (Phase 1).** No migrations have been written yet. This is the target schema for milestone M2. Each section changes from "planned" to "implemented (migration `<file>`)" when its migration lands. Conventions: [CONVENTIONS.md §4](CONVENTIONS.md#4-database-and-migrations-postgres).

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
| imo_number | text | not null, `~ '^[0-9]{7}$'`, `unique (organization_id, imo_number)` |
| vessel_type | vessel_type | not null |
| flag_state | text | not null, 2–60 chars |
| status | vessel_status | not null default `active` |
| year_built | integer | null, `between 1900 and extract(year from now()) + 1` (enforced in a trigger, because `now()` is not immutable) |
| gross_tonnage | integer | null, `> 0` |
| created_by | uuid | FK → profiles **set null** |
| | | `unique (id, organization_id)` (composite FK target) |

Indexes: `(organization_id, status)`, `(organization_id, name)`.

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
Indexes: `(organization_id, status, scheduled_for)`, `(vessel_id)`, `(inspector_id)`.
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

Items are **frozen once the parent inspection is completed or cancelled** (trigger).

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
Indexes: `(organization_id, status, due_date)`, plus the FK indexes.
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

Rules (trigger): after insert, **content is immutable**. The only allowed update is `pending → acknowledged`, made by `to_user_id`. Corrections are made by creating a new handover, so history is never silently overwritten.

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

Written **only** by `private.record_audit_event()` (security definer `after insert or update` trigger on each audited table). `actor_id` comes from `auth.uid()` inside the trigger, so it cannot be forged. `authenticated` gets SELECT only, with **no** insert, update or delete grants or policies.
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
| `public.create_inspection(vessel_id, title, scheduled_for, items jsonb)` | Inserts the inspection and its checklist items in one transaction. `security invoker`, so RLS applies. |
| `public.raise_work_order_from_item(item_id, ...)` | Creates a work order linked to a failed item, validating the item is a failure in the same organization. |

## 6. Primary-key choice

UUID v4 (`gen_random_uuid()`) for entity tables, `bigint identity` for `audit_events`. See [DECISIONS.md D-004](DECISIONS.md#d-004).
