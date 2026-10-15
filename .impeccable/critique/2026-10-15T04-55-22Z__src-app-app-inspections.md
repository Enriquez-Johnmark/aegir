---
target: inspections and work orders (re-critique after D-036 fixes)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/(app)/inspections"
timestamp: 2026-10-15T04-55-22Z
slug: src-app-app-inspections
---
# Re-critique: Inspections + Work orders (after the P1/P2 fixes, D-036)

Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent), fresh agents, no access to the previous run. One combined critique, stored under both route slugs.

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Unsaved Fail shows pressed while the header still says "No failed checks"; "Saved" ticks persist on every touched row |
| 2 | Match system / real world | 3 | Severity guidance excellent; "Fix: <pass condition>" auto-titles |
| 3 | User control and freedom | 2 | One tap on Pass/N/A on a recorded failure silently erases finding and severity (no confirm, no undo) |
| 4 | Consistency and standards | 3 | Severity cards vs priority dropdown; Low severity reuses the follow-up flag icon; linked work-order status as muted text |
| 5 | Error prevention | 2 | Same overwrite; Complete stays enabled while a finding edit is open (unsaved edit dropped) |
| 6 | Recognition rather than recall | 3 | Raise form context omits severity; severity cards don't preview their badge |
| 7 | Flexibility and efficiency | 2 | No "Pass remaining", no P/F/N keys, no inspections "Assigned to me"; each follow-up is a page round trip |
| 8 | Aesthetic and minimalist design | 3 | Quiet, signals land; stacked Scheduled/Overdue makes list rows uneven |
| 9 | Error recovery | 3 | Specific copy, focus to first invalid field, typing preserved |
| 10 | Help and documentation | 3 | Disabled-Complete reason, permission notes, severity guidance |
| **Total** | | **27/40** | **Acceptable** (top of band) |

Previous run's five priority issues: all resolved (completion now "the strongest moment"; collapsed failures and severity cards named as strengths; Overdue beside status; 44px items; h2s; amber icon verified at lab(41.6 20.8 48.6)). The lower total comes from a pre-existing defect the first reviewer missed (issue 1), scored by a different independent reviewer.

## Design Specificity Verdict
LLM: interaction model domain-specific (check → finding → severity → follow-up → prefilled work order, frozen-record language, voyage-consequence severities); visuals stock shadcn by design. The weakness is that the system does not protect the record it is built around.
Deterministic scan: CLI exit 0, `[]` on all 7 targets (also `--no-config`). Overlay on 14 runs (7 page states incl. open Fail panel and completion dialog × desktop + Pixel 7): only `overused-font` (Geist), a false positive. No overflow, no page errors. Sub-44px on Pixel 7: breadcrumb and entity text links only (~20px, low severity).

## Priority Issues
- [P1] One tap erases a recorded safety finding: `choose()` saves Pass/N/A immediately and `recordResultSchema` nulls finding + severity, even with a linked work order (pre-existing since eb2dc77; verified live and in code). Contradicts product principle 1. Fix: confirm inline before replacing a recorded failure, or lock the result once a work order references it (DB guard + pgTAP), optionally undo. Command: harden.
- [P2] The follow-up loop ejects the inspector: raising from a check or the completion dialog redirects to the new work order with no way back; raise form defaults to unassigned/no due date. Fix: return to the inspection (`?saved=raised`, anchored) or offer "Back to <inspection>"; suggest a due date from severity; show severity in the context box. Command: clarify, polish.
- [P2] Competing live primaries during sub-tasks: "Mark completed" stays navy beside the block form's "Mark blocked"; Complete stays enabled while a finding is being edited. Fix: suspend other transitions while a sub-form is open; disable Complete with a reason while a finding form is open. Command: distill.
- [P2] Urgency order buries critical blocked work: overdue low-priority railing ranks above critical blocked fuel-pump seal (`compareByUrgency`: overdue before priority, blocked unweighted). Fix: tiered order (overdue critical/high → critical incl. blocked → other overdue → rest); "blocked N days". Command: clarify.
- [P3] Fail panel is ~1000px tall on Pixel 7 (save below the fold); result toggles have no gap. Fix: 2×2 severity grid or guidance for the selected level only; reachable save; small toggle gap. Command: adapt.

## Persona Red Flags
Alex: no "Pass remaining", no result keys, no bulk assign, no inspections "Assigned to me", page round trip per follow-up.
Sam: toggle group disabled during save may drop focus to body (inferred, verify); disabled Complete not reachable by Tab so its hint isn't either; severity error turns all four titles red; history "→" read as "right arrow".
Casey: one-tap overwrite; tall Fail panel; typing-only findings; 12px muted "Saved" in sunlight; Complete never in the thumb zone mid-list.

## Minor Observations
Low severity flag icon collides with "Needs follow-up"; linked work-order status as plain text; blocked callout lacks who/since; edit h1 "Edit Repair…" and missing failed-check context; templates hidden below a blank row; 56px top bar with only "Aegir".

## Questions to Consider
- Should a failed check that already has a work order be editable at all, or is it now evidence?
- Is "overdue" really more urgent than "critical"?
- A work order raised from a critical finding closes without a note: safety record or status change?
