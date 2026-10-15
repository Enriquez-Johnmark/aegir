---
target: dashboard
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/(app)/dashboard"
timestamp: 2026-10-15T06-06-00Z
slug: src-app-app-dashboard
---
# Critique: Dashboard (M3 slice 4)

Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent). A separate technical audit ran in parallel (15/20, recorded in docs/TESTING.md).

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | "Live figures for <date>" is a per-request snapshot with no time; skeleton good |
| 2 | Match system / real world | 3 | Strong domain words; "Needs follow-up" label + "Failed checks without work" badge repeat each other |
| 3 | User control and freedom | 3 | Back restores scroll; handover rows lead nowhere |
| 4 | Consistency and standards | 2 | Three figures leave the page, two jump in-page; "Inspections due 3" lands on "4 open inspections"; panel header links differ |
| 5 | Error prevention | 3 | 20px "Work order" link stacked on the row's inspection link |
| 6 | Recognition rather than recall | 3 | Vessel "1 overdue" badge; inspection rows show the viewer's own name instead of "You" |
| 7 | Flexibility and efficiency | 2 | No role-aware ordering; figure badges don't deep-link to filtered lists; no skip link |
| 8 | Aesthetic and minimalist design | 3 | Overdue said in red up to three times per row; Vessels panel largely repeats the Work queue |
| 9 | Error recovery | 3 | One failed read blanks the whole dashboard (shared error boundary is clear) |
| 10 | Help and documentation | 3 | Panels state their rule; figures don't say what they count |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict
LLM: specific in content and rules (D-035/D-037 orders, never-truncated follow-ups, product language), generic in layout (stat strip + two-column list cards); the same page for every role.
Deterministic scan: CLI exit 0, `[]` (also `--no-config`). Overlay on 6 runs (manager, technician, viewer × desktop + Pixel 7): only `overused-font` (Geist, false positive). No overflow. One h1, six h2, named regions. Real small targets on Pixel 7: the 20px "Work order <status>" links in Failed checks and the 18px inline "N assigned to you". Shell has no nav/banner landmark and no skip link.

## Priority Issues
- [P1] Large text breaks the layout (audit, WCAG 1.4.4): at 200% text row titles collapse to 0–27px under `shrink-0` badges and figure badges clip ("2 overd"). Fix: wrapping row headers; container-driven figure grid; no clipping. Command: adapt.
- [P1] The page ignores who is looking; phones bury personal work under the fleet figures; "N assigned to you" is an 18px inline link. Fix: a "For you" band (my work, my inspections, my handovers) above the figures; "You" on inspection rows; 44px header link; compact figures on phones. Command: adapt, shape.
- [P1] The "Work order <status>" link is a 20px target stacked on the row's inspection link (A, B and audit agree; WCAG 2.5.8, Deck Hand Rule). Fix: 44px coarse-pointer target or a ButtonLink, named after the work order. Command: harden.
- [P2] Figures don't reproduce on the page they open, and behave inconsistently (3 leave the page, 2 jump in-page). Fix: deep-link to filtered views (or jump to panels consistently). Command: clarify.
- [P2] Failed checks drops recent addressed rows without a note (audit, verified). Fix: "N more not shown" with a domain total. Command: harden.
- [P2] Accessibility: run-on figure link names; no skip link; header inside main, no nav landmark or aria-current; silent loading; in-page jumps don't move focus. Command: harden, clarify.
- [P2] Signal redundancy: red date text + Overdue badge + figure + vessel panel; Vessels panel mostly duplicates the queue. Command: quieter, distill.
- [P2] Handovers raise a "for you" signal nobody can act on (until the handovers UI exists). Command: clarify.
- [P2] Dark theme defined but unreachable (audit, verified: nothing applies `.dark`). Fix: wire it (OS + toggle) or record light-only. Command: colorize.

## Persona Red Flags
Alex: figure badges don't open filtered lists; no grouping by vessel; vessels panel duplicates the queue.
Sam: run-on figure names; no skip link; silent loading; jumps don't move focus. (Positive: labelled regions, one tab stop per row, visible focus.)
Casey: personal work below the first phone screen (~8 screens long); 18px "assigned to you"; 20px work-order link inside the row link; inspector rows not marked "You"; "for you" handover at the bottom with no action.

## Minor Observations
Empty space under Inspections due on desktop; skeleton draws 4 panels and one figure block (page has 5 and five cells); mobile figure skeleton 144px vs ~370px; skeleton pulse ignores reduced motion; `Quiet` helper duplicated; no `loading.tsx` (convention); organisation-named summary region; the top bar's "Aegir" duplicates the sidebar brand.

## Questions to Consider
- On deck, what is the one thing the dashboard should tell a technician first?
- Should a zero figure keep a fifth of the strip?
- When 5 of 6 vessels qualify, is "Vessels needing attention" a queue or another view of the work queue?
