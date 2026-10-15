---
target: inspections and work orders (combined critique)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/(app)/work-orders"
timestamp: 2026-10-15T04-09-20Z
slug: src-app-app-work-orders
---
# Critique: Inspections + Work orders (M3 slices 2–3)

Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent). One combined critique, stored under both route slugs.

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Per-check "Saving / Saved" excellent; completing an inspection gives no notice; filter spinner hidden on mobile |
| 2 | Match system / real world | 3 | Strong domain copy; "Fix: <pass condition>" auto-titles read oddly; date inputs mm/dd/yyyy vs "13 Oct 2026" elsewhere |
| 3 | User control and freedom | 3 | Cancel and work-order completion confirm; **Complete inspection is one unconfirmed, final click**; unsaved Fail panel discarded silently |
| 4 | Consistency and standards | 3 | Completion confirmed for work orders, not inspections; work orders show status + Overdue, inspections show Overdue instead of status |
| 5 | Error prevention | 3 | Complete disabled with a reason while pending; duplicate-work warning; nothing flags unaddressed failures at completion |
| 6 | Recognition rather than recall | 3 | Follow-up context block is strong; Overdue hides whether an inspection was started; edit page drops status/blocked/finding context |
| 7 | Flexibility and efficiency | 2 | No "pass remaining", no result shortcuts, no search or column sort on either list |
| 8 | Aesthetic and minimalist design | 3 | Calm; recorded failures stay as open forms, each with a navy "Update finding" |
| 9 | Error recovery | 3 | Errors name the fix; focus moves to the first invalid field; FieldError announced |
| 10 | Help and documentation | 3 | Good hints and permission notes naming the person; severity guidance truncated in its dropdown |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict
LLM: behaviour is product-authored (one-tap results for deck use, "What did you find?" with voyage-consequence severities, derived follow-up flag, finding→work order with context carried and duplicate warning, legal moves only, blocking needs a reason); the visual layer is stock shadcn (table → facts card → history card), which DESIGN.md's earned-familiarity principle permits.
Deterministic scan: CLI detector exit 0, `[]` across inspections and work-orders routes, features, shared components and page header (also with `--no-config`; no ignores). Browser overlay injected on 10/10 runs (5 pages × desktop + Pixel 7): only `overused-font` (Geist 100%), a false positive given DESIGN.md's single-family rule. No overflow. Every control ≥44px on Pixel 7 except text links (breadcrumbs, inline vessel/source links, ~20px; inline-link exception). The detector cannot see the two P1s below: both are interaction/state issues.

## Priority Issues
- [P1] Completing an inspection is one tap, unconfirmed and silent (inspection-actions.tsx Complete form), though terminal and Cancel/work-order completion both confirm. Fix: AlertDialog summarising passed/failed/needs-follow-up with Raise links and "the checklist will be frozen"; SavedNotice afterwards; repeat Complete at the end of the checklist (sticky on mobile). Command: harden, clarify.
- [P1] Recorded failures stay as open edit forms (checklist-item.tsx `showFindingForm = editable && choice === "fail"`): N+1 navy primaries, and a recorded failure never reads as saved. Fix: collapse to read-only finding + SeverityBadge with a ghost "Edit finding". Command: distill, quieter.
- [P2] Overdue replaces lifecycle status for inspections (inspection-badges.tsx), unlike work orders; screen readers never hear "In progress". Fix: show both. Command: clarify.
- [P2] Severity picker is weak on deck: truncated guidance in a w-60 Select; SelectItem/DropdownMenuItem ~28px with no coarse-pointer size (breaks the Deck Hand Rule in every select). Fix: 4-option radio/ToggleGroup with full descriptions; pointer-coarse:min-h-11 on items. Command: adapt.
- [P2] Record-page structure and signal defects: CardTitle is a div, so Checklist/History/Raised-from cards are not headings; blocked-callout pause icon loses its warning tint because Alert's `*:[svg]:text-current` beats `text-warning` (verified in alert.tsx). Fix: h2 titles; override the svg colour. Command: harden, polish.

## Persona Red Flags
Alex (power user): no "Pass all remaining", no P/F/N keys, no search/sort on lists, must leave the inspection to raise work, ~750px eye travel from check text to toggles at 1360px. (Esc and ToggleGroup arrow keys work.)
Sam (keyboard/screen reader): no h2s on record pages; lifecycle status hidden under Overdue; Fail announced "pressed" before anything is saved and silently dropped on navigation; "Blocked" callout title duplicates the badge.
Casey (inspector on deck): Complete only at the top of a long checklist; truncated severity descriptions and ~28px options; unsaved finding lost on navigation; mm/dd/yyyy date input; list spinner hidden on mobile. (44px result toggles and autofocused finding textarea are right.)

## Minor Observations
"Fix: …" titles; edit h1 "Edit Repair main engine…"; desktop table truncates titles while Vessel has room; mobile clipboard icon wraps alone; history timestamps lack the year; other-org 404 has no h1/breadcrumb; viewer sees "Only Ingrid Solberg… can record results" instead of a plain read-only note; "Completed: Not yet" fact is noise.

## Questions to Consider
- If an inspection can be completed while a failure still needs follow-up, what does "completed" promise an auditor?
- On deck, is a severity dropdown the right instrument, or four big labelled targets carrying the voyage consequence?
- Should Overdue be a status, or a property beside the status everywhere (as on work orders)?
