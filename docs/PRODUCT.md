# Product

**Aegir: maritime safety and fleet operations management.**
A portfolio demonstration of a B2B Safety Management System workflow. It uses synthetic data only and is not a certified maritime safety system. It makes no claim of compliance with ISM Code, SOLAS, flag-state or class requirements.

## Target users

| Persona | Role in Aegir | Main jobs |
|---|---|---|
| Fleet / vessel manager | `manager` | Keep vessel records current, assign and track work, see fleet risk at a glance |
| Safety officer / inspector | `inspector` | Schedule and record inspections, log failed checks and raise follow-up work |
| Maintenance technician | `technician` | Work assigned work orders, report blocked work, hand over at shift change |
| Organization administrator | `admin` | Everything a manager can do; owns organization setup |
| Auditor / stakeholder | `viewer` | Read-only visibility, including audit history |

## Product goals

1. A safety finding is never lost: every failed check is visible until a work order addresses it.
2. Accountability: every significant change shows who did what and when, and that record can't be edited.
3. Clear operational state: overdue inspections, overdue work and unacknowledged handovers are visible on one dashboard.
4. Tenant isolation: one organization can never see or change another's data.

## Core workflows

1. **Sign in** → land on the dashboard for my organization.
2. **Vessels:** list, search and filter by status/type → view a vessel with its inspections and work orders → create or edit (managers).
3. **Inspection:** schedule an inspection with a checklist → start → record pass/fail/N/A per item, with a finding and severity on failures → complete (blocked while items are pending) → failed items show "needs follow-up".
4. **Work order:** raise one from a failed item, or standalone → assign, set priority and due date → move through open → in progress ↔ blocked → completed → history from audit events.
5. **Handover:** record outstanding tasks for a vessel or work order addressed to a colleague → the recipient acknowledges → the record is immutable afterwards.
6. **Audit:** browse organization-wide history, filterable by entity.
7. **Dashboard:** active vessels; inspections due or overdue; open and overdue work orders; recent failed checks; pending handovers. All counts come from live queries.

## MVP scope

P0: auth, organization-scoped access, vessels, inspections, work orders, dashboard, migrations, RLS and authorization tests, core automated tests, reproducible setup, deployment, README.
P1: handovers, audit history UI, wider RLS test coverage, responsive polish, screenshots.

## Explicit exclusions (MVP)

- Member and organization management UI (seeded only)
- Self-service sign-up, SSO, MFA
- File and photo attachments (Storage)
- Notifications (email, push), exports, advanced analytics and reporting
- Offline mode, native mobile apps
- Regulatory checklists or templates presented as official
