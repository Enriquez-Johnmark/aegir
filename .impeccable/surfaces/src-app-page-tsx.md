---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Landing page (`/`)

Scope: the public marketing page, Aegir's only Impeccable **Persuade** surface (D-024). Static: no session or database reads; prerendered.

Audience: a first-time visitor (a ship manager, inspector or technician) and, since D-050, a recruiter or hiring manager judging the author (who built it, with what, how rigorously, where to look next). Job: understand what Aegir does, believe it works, and try the live demo as one of four roles. Proof: real screenshots of the demo (synthetic data), the product's real badges, and facts the database enforces (organization isolation, an audit trail nobody can edit, rules in Postgres, the test suites). Constraints: true copy only, no invented customers or numbers; not a certified safety system; screenshots self-hosted within the CSP (D-039); the demo password shown as the README shows it (D-011); sign-in stays on `/login` (the WAF rule covers POST /login, D-044).

## Direction contract

THESIS: "Only what matters lights up": a deep-navy first viewport where the product's own signals are the only colour, refusing the white headline-over-screenshot hero with a feature-card row below.

OWN-WORLD: The Bridge Console at night. The hero is a `.dark`-scoped section on a deep navy field (dark-theme tokens, no new palette); Geist at display size; hairline rings at 10% white; the four signal colours used only as real `Badge` states; navy primary action. Below the hero the page returns to Chart White and the light tokens.

STORY: The visitor reads one promise, sees the real dashboard with its overdue, blocked and waiting signals lit, follows one failed check through inspection, work order, handover and dashboard, learns why the records can be trusted, then signs in as a role.

FIRST VIEWPORT: Header bar (wordmark, section links, Sign in). Left column: h1 at ~3.5rem, one-line lede, then the role picker as a hairline-ringed 2x2 panel (role, what to try, "Sign in as …" link) with the demo password line under it. Right column: the real dashboard screenshot rising out of the bottom edge with three signal badges called out over it. Primary action = the role picker, above the fold on desktop and Pixel 7.

FORM: "Night bridge", rank 5 of 7 on the grounded surface list, dealt as the lead; role picker detail donated by "Pick your watch" (rank 3); facts list from "Spec sheet" (rank 7) becomes the trust section. Seed key 08e5ca3c.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Revision (D-050, 2026-10-24)

Refined, not redesigned, after a critique scored 21/28 for the two audiences. Added: a "Built by" line in the hero, the copy button and shared-accounts note in the picker, a phone Source link, readable full-width step screenshots with full-size links, "How it's built" (request path, one real rule and its test, stack, evidence links), a "Built by" close, the `/login?as=` password hint and the link-preview image. The hero crops the app sidebar so the lit signals stay on screen from 1024px.

## Revision (D-051, 2026-10-24)

Audience narrowed to product users and clients after a critique through their eyes (19/28). Engineering content moved to `/engineering`. Added: "On deck and at the desk", operator-worded trust promises, "What it replaces, and what it doesn't do yet", first tasks per role, a night-field close with "Talk to Johnmark on LinkedIn", a "Try the demo" header primary, a phone capture in step 1 and the Fjord handover in step 3. Sign-in gained a home link, "Signing in as…" and demo role links.

