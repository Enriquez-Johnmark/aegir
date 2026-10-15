---
target: audit
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/(app)/audit"
timestamp: 2026-10-15T14-39-24Z
slug: src-app-app-audit
---
# Critique: Audit log and History cards (M3 slice 6)

Method: dual-agent (A: design review · B: detector/browser). Technical audit in parallel: 16/20 Good (Accessibility 3 · Performance 3 · Theming 4 · Responsive 3 · Implementation integrity 3).

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Page position vague ("(older page)"); no filter spinner below @3xl; live region repeats "50 changes" |
| 2 | Match real world | 3 | Product verbs are right, but a failed check reads "Changed 3 fields"; a seeded failed check reads only "Added to the checklist" |
| 3 | User control | 3 | No one-step "newer" page; filters replace history entries |
| 4 | Consistency | 3 | One entry grammar everywhere; History card placement varies by page; person picker lacks roles |
| 5 | Error prevention | 3 | Read-only; the risk is misreading evidence (fail hidden, seed attribution contradicts the record) |
| 6 | Recognition | 2 | Entries don't say which vessel or inspection; check names repeat across inspections |
| 7 | Flexibility | 2 | Two filters and shareable URLs only: no date or vessel filter |
| 8 | Minimalism | 3 | Calm and on-system, but low density, "UTC" on every row, actor is the faintest text |
| 9 | Error recovery | 3 | Filtered-empty state offers "Show all changes"; foreign cursor silently shows the newest page |
| 10 | Help | 3 | Immutability and UTC stated; "System (seed data)" unexplained where the record names a person |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict
LLM: specific in its words (Raised, Scheduled, Handed over to …, the block reason quoted once, long text named), generic in its structure (a standard activity feed). Missed opportunity: the vessel never appears on an entry.
Deterministic scan: CLI `[]` on the new source (also `--no-config`); a static-HTML fallback scan found only app-wide items (pinned Geist font, shell nesting), none from this slice. 28 page loads (desktop, Pixel 7, each at 100% and 200% text): no console errors, no overflow, one h1, no unnamed controls; tab order filters → entries → pager; the arrow is read as "to"; the mobile sheet closes on navigation. axe (WCAG 2.2 AA) 0 violations on 8 screens.

## Priority Issues
- [P1] A failed check's headline is "Changed 3 fields"; seeded failed checks never show a result. Fix: lead field per type as headline; creation states the result and severity. Command: clarify, harden. **Fixed.**
- [P1] Entries lack vessel/inspection context; same-named links go to different inspections. Fix: "name · type · inspection · vessel" as the link text. Command: clarify, layout. **Fixed.**
- [P2, audit] Deep pages scan and discard every newer row (cursor `or` is only a filter). Fix: add `occurred_at <= cursor`. Command: optimize. **Fixed.**
- [P2, audit] Unknown/foreign actor filters the log while the control says "Everyone"; empty state doesn't name filters. Command: harden. **Fixed.**
- [P2, audit] Pager disappears on a page with nothing readable. Command: harden. **Fixed.**
- [P2] Record and History disagree on who acted (seed has no actor). Owner's choice: explain on the card. **Fixed.**
- [P2] Actor is a bare name; "50 changes" reads as a total; 18px record link is the only tap target; weak focus ring. Command: adapt, clarify, polish. **Fixed** (whole-row link, inset ring, "by …", "Showing the newest 50 changes · filters").
- [P3] Id not UUID-checked before a filter; malformed jsonb dates/person ids throw; arrow and type label wrap from their values; no `<time>` in History; filter skeleton height. **Fixed.**
- [P3] Date and vessel filters, sticky day headings, collapsing runs on one record, focus after paging, roles in the person filter, ~200-check URL length. **Deferred** (D-042).

## Persona Red Flags
Auditor: couldn't find who recorded the Aurora fail (no vessel axis, fail not headlined, seed attribution contradicts). Manager on a phone: no filter feedback, ~6,800px to "Older changes", 20px tap targets. Screen-reader user: good structure; repeated identical link names, actor without "by", live region unchanged after filtering.
