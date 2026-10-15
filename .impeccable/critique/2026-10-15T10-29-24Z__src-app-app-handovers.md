---
target: handovers
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/(app)/handovers"
timestamp: 2026-10-15T10-29-24Z
slug: src-app-app-handovers
---
# Critique: Handovers (M3 slice 5)

Method: dual-agent (A: design review · B: detector/browser). Technical audit in parallel: 16/20 Good.

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | List and dashboard rows show only a date; waiting time across a shift is invisible |
| 2 | Match real world | 3 | "Taken the work over" copy promises a reassignment that acknowledging doesn't do |
| 3 | User control | 3 | Long text lost on Cancel/Back without warning; immutable send with no review |
| 4 | Consistency | 3 | "Hand over" sits apart from the work order's status actions on phones |
| 5 | Error prevention | 3 | Subject fixed from a work order, vessel-scoped choices; no preview, no summary counter |
| 6 | Recognition | 3 | Recipient picker shows bare names (no role, no watch) |
| 7 | Flexibility | 2 | No counts in views or sidebar, no "next for you" after acknowledging; "All handovers" view unselectable (audit) |
| 8 | Minimalism | 3 | From/to/time repeated three times; the tasks come last |
| 9 | Error recovery | 3 | Focus to first invalid works; hints and errors not linked to controls |
| 10 | Help | 3 | Task-focused hints |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict
LLM: grounded copy (change of shift, UTC hours, "Handing over a work order on Northwind Fjord"), signals disciplined; composition generic (header, facts grid, card) and treats the handover as a record more than a baton being passed.
Deterministic scan: CLI `[]` (also `--no-config`); overlay on 8 runs found only `overused-font` (false positive). The app's own CSP blocked the injected detector script (bypassed in the test browser only), which confirms D-039. No overflow at 100% text; one h1 per page; no empty or duplicate link names. Small Pixel 7 targets: inline vessel link (21px) and breadcrumb.

## Priority Issues
- [P1] Acknowledge sits above the outstanding tasks it confirms (phone: tasks at ~68% of the page). Fix: tasks first, acknowledge directly under them, facts last. Command: layout, distill.
- [P1] "You've taken this work over" overstates what acknowledging records (the work order's assignee doesn't change). Fix: honest copy, or offer "also assign the work order to me" (product decision). Command: clarify.
- [P1, audit] "All handovers" can't be selected: the view value "all" collides with the shared filter sentinel ALL, which deletes the key. Same bug in "All work orders" and "All inspections" since those slices. Command: harden.
- [P1, audit] Detail facts grid overlaps/overflows at 200% text (viewport `md:grid-cols-4`). Command: adapt.
- [P2] Waiting time invisible in the inbox (date only). Command: clarify.
- [P2] Recipient picker without role/context. Command: clarify.
- [P2] Form: recipient width `md:w-80` overflows at 768px/200%; select values clip; hints/errors not linked via aria-describedby (app-wide `Field`). Command: adapt, harden.
- [P2, audit] Raw invalid URL values shown in filter boxes; unknown vessel gives a misleading empty state. Command: harden.
- [P2, audit] Not-found page has no h1. Command: polish.

## Persona Red Flags
Casey: detached "Hand over" button, bare-name picker, no preview, text lost on Back, nothing points back to their work after sending.
Alex: no counts, date-only rows, no "next for you", acknowledging doesn't take over the work order, handovers panel last on the phone dashboard.
Sam: hints/errors unlinked, acknowledge before content in reading order, "→" read as "right arrow".

## Minor Observations
Dashboard re-creates the For-you badge and names the sender instead of "You"; dead branch in detail; listVesselNames fetched twice per list request; error mapping relies on exception text; outstanding tasks are free text (a checklist may fit better).

## Questions to Consider
- Should acknowledging offer to reassign the attached work order, or is a handover only "I've read it"?
- Should a handover pending longer than a shift become a warning signal?
- Should outstanding tasks be a short checklist the recipient ticks off?
