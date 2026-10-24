---
target: landing page for users and recruiters
total_score: 21
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 3
target_identity: "file:/Users/johnmarkenriquez/Project/Personal/aegir/src/app/page.tsx"
target_fingerprint: "sha256:bd0af90efa3007d41666567c5f61e75436029745455b0d37150b5ecbf61da9d7"
target_path: /Users/johnmarkenriquez/Project/Personal/aegir/src/app/page.tsx
timestamp: 2026-10-24T03-42-33Z
slug: src-app-page-tsx
---
# Critique: landing page (`src/app/page.tsx`), product visitors + recruiters

Method: dual-agent (A: design review · B: detector + headless browser; Claude in Chrome not connected, Playwright fallback).

## Heuristics (21/28, n/a: 7, 9, 10)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Role links don't say the email is pre-filled and the password must be typed |
| 2 | Match system / real world | 2 | Recruiter model (project, stack, author, contact) unmet; stack never named |
| 3 | User control and freedom | 3 | Below 768px the header nav incl. Source is hidden; footer is ~6,000px down |
| 4 | Consistency and standards | 4 | Real badges, dashboard row pattern, one navy primary per region |
| 5 | Error prevention | 3 | Shared-account caveat only under the closing table, not by the hero picker |
| 6 | Recognition over recall | 3 | Password shown on / but not on /login; no copy button |
| 7 | Flexibility and efficiency | n/a | Persuade surface |
| 8 | Aesthetic and minimalist | 3 | Step screenshots ~8px text on desktop; lit badges clipped below ~1370px |
| 9 | Error recovery | n/a | Static page |
| 10 | Help and documentation | n/a | Persuade surface |

## Specificity
Authored for the product (night hero, lit real signals, one-finding trail). Not authored for the author: nothing says who built it or how. Detector: 1 advisory (text-[2.5rem] hero h1, documented Display exception, false positive); in-page overused-font Geist (intentional, DESIGN.md).

## Priority issues
1. [P1] Recruiter can't answer who built it, with what, how to reach them (name only in ©, stack unnamed, no contact, Source hidden on phones). shape → clarify
2. [P1] Engineering rigour told, not shown; no architecture picture; Decisions log buried in footer. shape → layout
3. [P1] Password breaks between role link and /login; no copy; caveat far from hero picker. onboard → clarify
4. [P2] Hero lit signals off-canvas at 1024, partly at 1280. adapt
5. [P2] Step screenshots unreadable (~8px desktop; phone crops lose subject). layout → polish
6. [P2] No Open Graph / share preview. polish

## Personas
Recruiter: no name/stack/contact above the fold; only CTA is signing in as a maritime role. Hiring manager: claims without one-click evidence, no diagram. Fleet manager: caveat and password hint missing at sign-in. Phone: no nav, no product image above fold, 6,287px page.

## Minor
~300px dead space under audit-log figure; closing table repeats the hero picker in the end position; 28rem crop of the phone capture reads like a clipping bug.
