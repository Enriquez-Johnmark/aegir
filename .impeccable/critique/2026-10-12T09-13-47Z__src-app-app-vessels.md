---
target: Vessels feature (M3 slice 1)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/(app)/vessels"
timestamp: 2026-10-12T09-13-47Z
slug: src-app-app-vessels
---
# Critique: Vessels (M3 slice 1)

Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent)

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | "Clear filters" leaves stale search text; no save confirmation; header never says where you are |
| 2 | Match system / real world | 3 | Strong maritime vocabulary; flag state is free text |
| 3 | User control and freedom | 2 | No breadcrumb or back link on detail/edit |
| 4 | Consistency and standards | 3 | Empty-state dashed borders vs hairline rings; IMO mono only on desktop; "Medium" and "Open" identical outline pills |
| 5 | Error prevention | 2 | Free-text flag; empty IMO yields two contradictory errors |
| 6 | Recognition rather than recall | 3 | Edit page never names the vessel; all detail tabs titled "Vessel" |
| 7 | Flexibility and efficiency | 2 | Rows not clickable; no "needs attention" sort |
| 8 | Aesthetic and minimalist design | 3 | Colour spent on normal states; oversized empty/forbidden voids |
| 9 | Error recovery | 3 | Specific messages, but focus stays on body after a failed submit |
| 10 | Help and documentation | 2 | Field hints vanish exactly when the field errors |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict
LLM: competent, quiet shadcn CRUD; specificity comes from domain copy (IMO check digit, GT, flag state, laid up) rather than composition. The list breaks the Bridge Console premise: normal states light up (green Active, amber Laid up) while real risk (Northwind Fjord's critical, blocked work) is a plain "2".
Deterministic scan: CLI detector exit 0, 0 findings across vessels routes, feature and shared components. Browser injection succeeded on 8/8 page × viewport runs: low-contrast 4.3:1 on the sidebar avatar initials (muted-foreground on muted), missed by the LLM pass; overused-font (Geist) is a deliberate DESIGN.md choice (single family, Operate mode), not a defect. Hidden Base UI select inputs flagged as unlabeled are false positives (aria-hidden, tabindex -1). No overflow, no missing alt, heading order clean (but the detail h1 accessible name includes the badge text). Mobile controls are 32px tall (sidebar toggle 28px), below the 44px touch target guidance.

## Priority Issues
- [P1] List hides fleet risk and spends colour on normal states (domain.ts VESSEL_STATUS_BADGE; vessels-list open-work count). Fix: neutral badges for active/laid up, overdue/critical counts in the list in destructive text, "Needs attention" sort. Command: colorize, layout.
- [P1] Clear filters leaves the stale search term (vessel-filters.tsx query state never re-synced). Command: harden.
- [P1] Touch targets 32px on touch devices (button/input/select/input-group/sidebar trigger). Fix: 44px on pointer-coarse. Command: adapt.
- [P2] No wayfinding: header static "Aegir", breadcrumb unused, static detail metadata, edit h1 doesn't name the vessel. Command: clarify.
- [P2] Form errors: double IMO error, no focus on first invalid field, hint hidden on error, no save confirmation. Command: harden.
- [P2] Row hover without row click (table rows). Command: polish.
- [P2] Avatar initials contrast 4.3:1 (sidebar footer). Command: polish.

## Persona Red Flags
Alex (fleet manager): no needs-attention sort, must hit the name text, no save confirmation.
Sam (keyboard/screen reader): focus lost after failed submit; severity badges lack icons (Two-Channel Rule); sort select has no visible label; detail h1 reads "Northwind FjordIn maintenance".
Casey (inspector on deck, phone): no back control, 32px targets, detail items not tappable, centred actions inside viewport-tall dashed voids.

## Minor Observations
List description promises inspection history it doesn't show; "2 open" repeats the card title; "Most recent first." is filler; empty-filter state doesn't name active filters; forbidden route keeps "Register a vessel" subtitle; E2E-created vessels visible in local demo data; "Newest build" is ambiguous; dead space under detail cards on desktop.

## Questions to Consider
- If Northwind Fjord has a critical blocked job, why is it the least colourful row?
- Is this page a register (A–Z) or a watch list (worst first)?
- On deck, should the top action on a vessel be "Edit vessel" or its open findings?
