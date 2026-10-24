---
target: landing page for product users and clients
total_score: 19
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 3
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/page.tsx"
target_fingerprint: "sha256:7215593af46019ccfb518299ffd1831d36938d855a9e1e9ab9b8ed1a31f06137"
target_path: /Users/johnmarkenriquez/Project/Personal/aegir/src/app/page.tsx
timestamp: 2026-10-24T04-48-34Z
slug: src-app-page-tsx
---
# Critique: landing page (`src/app/page.tsx`), product users and clients

Method: dual-agent (A: design review via headless Playwright · B: detector + in-page detector, inline injection under CSP).

## Heuristics (19/28, n/a: 7, 9, 10)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | /login?as= never says "signing in as Fleet manager (Marcus Reyes)" |
| 2 | Match system / real world | 2 | Maritime language in hero/steps; engineering language (RLS, triggers, pgTAP, live query) from trust onward |
| 3 | User control and freedom | 3 | Header Sign in → bare /login: no demo hint, no role choice, no way home |
| 4 | Consistency and standards | 3 | Roles described twice with different copy |
| 5 | Error prevention | 3 | Good on the role path; lost via header Sign in |
| 6 | Recognition over recall | 3 | Bare /login: email and password must be remembered |
| 7 | Flexibility | n/a | Persuade |
| 8 | Aesthetic and minimalist | 2 | ~35% of the page is for engineers; password/caveat repeated 3x |
| 9 | Error recovery | n/a | Static |
| 10 | Help | n/a | Persuade |

## Specificity
Hero and the one-finding story are product-specific. From the trust section on, the page reads as a developer portfolio; it never says what Aegir replaces. Detector: 1 known advisory (hero 2.5rem Display exception), in-page overused-font Geist (intentional). 29 engineering terms in page text.

## Priority issues
1. [P1] Engineering layer sits in the user's path (How it's built between proof and demo; header and hero links; SQL open by default). layout → distill
2. [P1] Trust section speaks to engineers, not operators; audit-log proof unreadable on desktop. clarify
3. [P1] Header Sign in is a dead end (bare /login). onboard
4. [P2] On-deck phone experience promised, never shown (step 1 is a desktop capture). adapt
5. [P2] Story breaks at step 3 (handover crop shows other work); technician demo can't continue the story's job (assigned to Kenji). polish
6. [P2] No "what it doesn't do" / "what it replaces" for evaluators. clarify

## Personas
Fleet manager: no "why not spreadsheets", jargon, page ends on LinkedIn. Inspector on phone: no phone checklist, 6px crop. Technician: can't find the story's job. Decision-maker: no scope list, isolation only in RLS terms.

## Minor
Abstract lede ("audited workspace"); demo section repeats password; "Viewer" could read "Viewer (auditor, read-only)"; audit caption developer wording; no primary "Try the demo" in header.
