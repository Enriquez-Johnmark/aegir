---
name: Aegir
description: Maritime safety and fleet operations management. A calm operational console where only what matters lights up.
colors:
  harbour-navy: "oklch(0.37 0.09 252)"
  harbour-navy-night: "oklch(0.8 0.07 252)"
  chart-white: "oklch(1 0 0)"
  bridge-ink: "oklch(0.145 0 0)"
  console-panel: "oklch(0.985 0.004 252)"
  console-panel-hover: "oklch(0.95 0.01 252)"
  deck-grey: "oklch(0.97 0 0)"
  bulkhead-line: "oklch(0.922 0 0)"
  log-grey: "oklch(0.556 0 0)"
  helm-ring: "oklch(0.55 0.1 252)"
  signal-green: "oklch(0.5 0.12 152)"
  signal-amber: "oklch(0.5 0.11 65)"
  signal-blue: "oklch(0.5 0.11 232)"
  signal-red: "oklch(0.53 0.21 27)"
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.harbour-navy}"
    textColor: "{colors.chart-white}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.chart-white}"
    textColor: "{colors.bridge-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  input:
    backgroundColor: "{colors.chart-white}"
    textColor: "{colors.bridge-ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  card:
    backgroundColor: "{colors.chart-white}"
    textColor: "{colors.bridge-ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  sidebar:
    backgroundColor: "{colors.console-panel}"
    textColor: "{colors.bridge-ink}"
    width: "256px"
  badge-critical:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.signal-red}"
    rounded: "{rounded.pill}"
    height: "20px"
  badge-warning:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.signal-amber}"
    rounded: "{rounded.pill}"
    height: "20px"
  badge-success:
    backgroundColor: "{colors.signal-green}"
    textColor: "{colors.signal-green}"
    rounded: "{rounded.pill}"
    height: "20px"
---

# Design System: Aegir

Source of truth for tokens: `src/app/globals.css` (shadcn `base-nova` theme, Tailwind v4 `@theme inline`). This file explains how to use them. Product context: [docs/PRODUCT.md](docs/PRODUCT.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md) D-012, D-024, D-026.

## Overview

**Creative North Star: "The Bridge Console"**

Aegir is used the way a ship's bridge is used at night: long stretches of calm monitoring, broken by moments that demand an immediate, correct response. The interface is therefore quiet by default. Surfaces are neutral, type is a single well-tuned sans, and the only persistent colour is a deep harbour navy that marks where you can act. Everything else that lights up is a signal: a failed check, an overdue work order, a blocked task, a handover waiting for acknowledgement. Because colour is rare, a signal is impossible to miss.

All authenticated screens are Impeccable **Operate** surfaces: managers scan a fleet, inspectors record results on a phone on deck, technicians update status between jobs. Earned familiarity beats novelty: standard shadcn components, standard navigation (sidebar + page header), consistent controls on every screen. Brand lives in precise details: tabular numerals, exact status language, navy focus rings, a palette-tinted text selection. Density is comfortable-compact, so tables show many rows without feeling cramped and stay touch-friendly on mobile. The public landing page is the only **Persuade** surface and may carry more of the navy.

**Key Characteristics:**
- Quiet neutral canvas; one navy accent reserved for action, selection and focus.
- Colour is a signal vocabulary (critical, warning, success, info), never decoration.
- One type family (Geist), fixed rem scale, tabular numerals for data.
- Flat surfaces separated by hairline rings, not shadows.
- Comfortable-compact density; 32px controls; mobile-first sidebar collapse.

## Colors

A restrained, cool-neutral palette with one deep maritime accent and four semantic signals. All values are OKLCH (the project's canonical colour space) and are AA-checked (computed WCAG contrast, not estimated).

### Primary
- **Harbour Navy** (`oklch(0.37 0.09 252)`, `--primary`): primary buttons, links, the current navigation item, focus and selection. 10.4:1 against white. Dark theme uses **Harbour Navy Night** (`oklch(0.8 0.07 252)`) with dark navy text (9.7:1).

### Neutral
- **Chart White** (`oklch(1 0 0)`, `--background`, `--card`): content canvas and cards.
- **Console Panel** (`oklch(0.985 0.004 252)`, `--sidebar`): the second neutral layer for the sidebar; a hint cooler than content so navigation recedes. Hover/active **Console Panel Hover** (`oklch(0.95 0.01 252)`).
- **Deck Grey** (`oklch(0.97 0 0)`, `--muted`, `--secondary`): quiet fills, skeletons, secondary buttons.
- **Bulkhead Line** (`oklch(0.922 0 0)`, `--border`, `--input`): hairlines and input strokes.
- **Bridge Ink** (`oklch(0.145 0 0)`, `--foreground`): primary text.
- **Log Grey** (`oklch(0.556 0 0)`, `--muted-foreground`): secondary text, descriptions, timestamps. 4.7:1 on white, 4.5:1 on Console Panel.
- **Helm Ring** (`oklch(0.55 0.1 252)`, `--ring`): focus indicators.

### Signals (semantic status)
Used as text/icon colour on a 10% tint of itself (20% in dark), the same pattern shadcn uses for `destructive`. Every pair clears 4.5:1.
- **Signal Red** (`oklch(0.53 0.21 27)`, `--destructive`): critical severity, overdue, failed checks, destructive actions. 4.95:1 on its tint. (Darkened from shadcn's default, which measured 3.99:1 on its tint.)
- **Signal Amber** (`oklch(0.5 0.11 65)`, `--warning`): blocked work, due soon, high severity. 5.35:1 on its tint.
- **Signal Green** (`oklch(0.5 0.12 152)`, `--success`): passed checks, completed work, acknowledged handovers. 4.93:1 on its tint.
- **Signal Blue** (`oklch(0.5 0.11 232)`, `--info`): in progress, scheduled, informational. 5.02:1 on its tint.

Dark theme signals: success `oklch(0.78 0.13 152)`, warning `oklch(0.82 0.13 75)`, info `oklch(0.78 0.1 232)`, destructive `oklch(0.704 0.191 22.216)`; all ≥4.6:1 on a 20% tint over the dark card.

Charts (`--chart-1…5`) are a single navy lightness ramp so data series read as one family; differentiate series by lightness and labels, never by hue alone.

### Named Rules
**The Signal Rule.** Colour other than navy and neutrals means state. If a coloured element does not report a status, severity or risk, it is wrong.
**The Lit Instrument Rule.** Navy marks where you can act or where you are (primary action, current nav item, focus, selection). It never fills large decorative regions on Operate screens.
**The Two-Channel Rule.** Every signal also carries text (and usually an icon). Colour is never the only channel.

## Typography

**Body, UI and headings:** Geist (`--font-geist-sans`, via `next/font`) with the system sans fallback.
**Data:** Geist Mono only for genuinely technical identifiers (IMO numbers, IDs); everyday numbers stay in Geist with `tabular-nums`.

**Character:** One neutral, precise sans that carries every role. Hierarchy comes from size and weight steps, not from a display face.

### Hierarchy
- **Headline** (600, 1.5rem / 24px, tight tracking -0.025em): page titles (`h1`), one per screen.
- **Title** (500, 1rem / 16px): card and section titles (`CardTitle`).
- **Body** (400, 0.875rem / 14px, line-height 1.43): default UI text, table cells, descriptions. Prose blocks cap at ~70ch.
- **Label** (500, 0.75rem / 12px): badges, field hints, column meta, timestamps.
- **Data** (Geist Mono 400, 0.8125rem): identifiers only.

### Named Rules
**The Ledger Rule.** Any number that is compared, totalled or scanned in a column uses `tabular-nums`.
**The Fixed Scale Rule.** No fluid (`clamp`) type on Operate screens; steps stay at 12/14/16/24px.

### Touch
**The Deck Hand Rule.** On coarse pointers (phones, tablets) every interactive control is at least 44px tall (`pointer-coarse:` variant in Button, Input, InputGroup, SelectTrigger, SelectItem, DropdownMenuItem and sidebar items); fine pointers keep the compact 32px density. New interactive components must follow it.

## Layout

App shell: collapsible sidebar (`16rem`, icon rail `3rem`, sheet on mobile `18rem`) plus a 56px page header with the sidebar trigger. Page content uses `p-4` (16px) on mobile and `md:p-6` (24px) from 768px up. Vertical rhythm is `gap-6` (24px) between page sections and `gap-4` (16px) inside cards and forms (card padding 16px, `size="sm"` 12px). Spacing follows the 4px Tailwind grid. Tables are full-width inside their card. Wide tables become stacked rows, not horizontal scroll, when a row has more than about four columns, and the switch follows **the list's own width in rem** (container queries, `@4xl`), not the viewport: enlarged text gets the stacked rows too, so nothing is clipped. Titles wrap; they are never truncated. Filter bars follow the same rule (`@xs` two columns, `@3xl` one row), and a long filter value wraps rather than being cut off. Forms are single-column up to `max-w-2xl`. Auth screens centre a `max-w-sm` card on a Deck Grey wash.

## Elevation & Depth

Flat by default. Surfaces are separated by tonal layers (Console Panel vs Chart White) and 1px hairlines (`ring-1 ring-foreground/10` on cards, `border` on inputs), not by shadows. Overlays (dropdowns, popovers, sheets) get the component library's own soft shadow because they float above content. That is the only shadow use.

**The Quiet Hull Rule.** Declare elevation once: a hairline ring **or** a shadow, never both on the same surface. Cards never get decorative shadows.

## Shapes

Gently rounded and consistent: base radius 10px (`--radius: 0.625rem`), controls at 10px (`rounded-lg`), cards at 14px (`rounded-xl`), badges are pills (small controls only). No coloured side borders on cards, alerts or list items. Status is shown with a badge or icon, not a stripe.

## Components

### Buttons
- **Shape:** gently rounded (10px), 32px tall (`h-8`); `lg` 36px for the single primary action on auth/landing.
- **Primary:** Harbour Navy fill, near-white text. One per view region.
- **Outline / Secondary / Ghost:** neutral; secondary actions and toolbars.
- **Destructive:** Signal Red on a 10% red tint, never a solid red slab; destructive actions also confirm with `AlertDialog`.
- **Loading:** `Spinner` with `data-icon="inline-start"` plus disabled; the label changes to the progressive verb ("Signing in…").

### Status badges (signature component)
- **Style:** pill, 20px tall, 12px medium text, signal colour on its own 10% tint (`variant="destructive" | "warning" | "success" | "info"`; neutral states use `secondary`/`outline`).
- **Vessel status is context, not risk:** active → `outline`, in maintenance → `info`, laid up → `secondary`, decommissioned → `outline`. Risk is carried by the attention signals below.
- **Attention signals** (`AttentionSignals`): `destructive` + icon for "N critical" and "N overdue", `warning` + icon for "N blocked", muted "On track" otherwise. Severity badges always carry an icon.
- **Mapping:**
  - critical severity, overdue, failed → `destructive`
  - blocked, high severity, due soon → `warning`
  - completed, passed, acknowledged → `success`
  - in progress, scheduled → `info`
  - open, pending, not applicable → `outline`
- **Copy:** the product's own words ("Overdue", "Blocked", "Needs follow-up"), never colour alone.
- **Inspections:** the lifecycle badge is always shown (scheduled / in progress → `info`, completed → `success`, cancelled → `outline`), with `Overdue` (destructive + clock icon) beside it when late, as on work orders. Check results: pass → `success`, fail → `destructive`, N/A and not checked → `outline`, each with an icon. Finding severity: critical → `destructive`, high → `warning`, medium and low → `secondary`, always with an icon and the word "severity". A failed check without a work order carries `Needs follow-up` (`warning` + flag icon).

- **Work orders:** status open → `outline`, in progress → `info`, blocked → `warning`, completed → `success`, plus a separate `Overdue` badge (destructive + clock). Priority: critical → `destructive` (octagon), high → `warning` (triangle), medium → `secondary` (equals), low → `secondary` (down arrow); the word "priority" is read by screen readers. A work order raised from a check carries a small clipboard icon with an accessible label.

### Working a work order
- One primary action for the current state (Start work, Mark completed, Resume work); Mark blocked is outline and opens an inline reason form, and while that form is open the other moves step aside (one primary per task); Back to open is ghost. Completion confirms in an `AlertDialog` because it is final.
- A blocked work order shows its reason in a neutral `Alert` with a warning-tinted pause icon, above the actions.
- The queue reads most urgent first: overdue critical and high work, then critical, then anything else overdue, then the rest (D-037).
- A work order raised from a failed check returns to the inspection, whose notice links to the new work order.
- History is a plain chronological list (what changed, who, when in UTC), never editable.

### Recording results (inspection checklist)
- Each check is a numbered row: category (label size, muted), the check itself, and a three-way `ToggleGroup` (Pass / Fail / N/A, outline, joined). The pressed option takes its signal tint (success, destructive, neutral), so the row reads at a glance.
- Pass and N/A save on tap with an inline "Saving / Saved" status; Fail opens an inline panel (Deck Grey wash, no card) with the finding and severity, saved by "Record failure". No modal. Severity is four choice cards (radio group) that show each level's full guidance, never a truncated dropdown.
- A recorded failure collapses to a read-only finding with its severity badge and a ghost "Edit finding"; only one finding form is open at a time, so the region keeps a single navy action.
- A recorded failure is never replaced by one tap: tapping Pass or N/A asks inline first ("Replace this failure with Pass?", destructive confirm, focus on "Keep the failure"). Once a work order follows it up, Pass and N/A are disabled with the reason shown (the database enforces it too).
- Complete waits, disabled with its reason, while any finding form or replace question is open.
- Lifecycle actions sit above the record: one primary (Start or Complete), Cancel as outline behind an `AlertDialog`. Complete is repeated at the end of the checklist, where the last result is recorded. A disabled Complete always says why ("Record 2 more checks…").
- **Completion is confirmed** (`AlertDialog`), because it freezes the checklist: the dialog states the result summary and lists failed checks without a work order, with "Raise work order" links; completing anyway is allowed (they stay flagged on the dashboard). The record then shows a `SavedNotice` that repeats any follow-up still owed.

### Dashboard
- **Figures row, then queues.** One hairline-ringed row of five figures (label 12px muted, value 24px semibold `tabular-nums`, one line of signals), joined by 1px gaps rather than separate cards. The column count follows the row's own width (container queries in rem: one column when narrow, two from `@xs`, five from `@5xl`), so larger text gets fewer, wider columns. Each figure jumps to the panel that lists what it counts, and focus follows (D-038). The queues below are the structure; the figures only summarise.
- **Figures stay in ink.** A signal (overdue, blocked, failed checks without work, "for you") is a badge with an icon beside the figure; a calm state is a muted sentence ("None overdue or blocked"), never a green badge.
- **Queue panels** are cards with an `h2` title, a one-line rule for what is listed and in what order, an optional ghost "All open" / "Watch list" link, and rows that reuse each feature's badges and stretched-link row pattern. Empty panels say what is clear in one muted sentence; a panel that leaves rows out says how many. Row headers wrap (title first, badges below) rather than squeezing the title. Two columns from `lg`; handovers span both.

### Cards / Containers
- **Corner:** 14px. **Background:** Chart White. **Border:** hairline ring. **Shadow:** none. **Padding:** 16px (12px `sm`).
- Cards group a task or a record. Never nest cards; never build page scaffolds from same-size icon cards.

### Inputs / Fields
- **Style:** 32px, 10px radius, Bulkhead Line stroke, transparent fill; layout with `FieldGroup` / `Field`.
- **Focus:** 3px Helm Ring at 50% (`focus-visible:ring-3 ring-ring/50`).
- **Error:** `data-invalid` on `Field`, `aria-invalid` on the control, message in `FieldError` (announced as an alert); copy names the problem and the fix.

### Navigation
- Sidebar on Console Panel; items 32px, icon + label; the current route uses `isActive` (Console Panel Hover fill, medium weight). Collapses to an icon rail with tooltips on desktop and to a sheet on mobile (`SidebarTrigger`). The user menu sits in the sidebar footer.

### Wayfinding
- Record and form pages show a breadcrumb above the page title (`PageHeader breadcrumbs`). Status badges sit beside the `h1`, never inside it, so the heading's accessible name is the record name. Browser tab titles name the record (`generateMetadata`).
- Links that look like buttons are real links (`ButtonLink`), never a `Button` rendering an `<a>`.
- After a save, the record page shows a dismissible `SavedNotice` ("Vessel added", "Changes saved").

### Loading and empty states
- Loading: `Skeleton` blocks shaped like the content they replace, behind `<Suspense>`; never a spinner in the middle of content.
- Empty: `Empty` component that says what belongs here and, when the role allows it, offers the action that creates it. Use the shared `EMPTY_PANEL` style (sized to content, hairline ring), never a viewport-tall dashed box. A filtered-empty state names the active filters.

## Do's and Don'ts

### Do:
- **Do** use semantic tokens (`bg-primary`, `text-muted-foreground`, `text-warning`) and shadcn variants; never raw palette classes.
- **Do** pair every signal colour with text and, for severity, an icon (The Two-Channel Rule).
- **Do** use `tabular-nums` for counts, dates and tonnage in tables and metrics (The Ledger Rule).
- **Do** keep one primary (navy) action per view region.
- **Do** show skeletons shaped like the content while data streams in.
- **Do** compose light and dark themes deliberately; signals are re-tuned for dark, not inverted. (The MVP ships light-only, D-038: the dark tokens exist but nothing applies them yet.)

### Don't:
- **Don't** use colour as decoration: no navy hero blocks on Operate screens, no gradient text, no tinted card backgrounds (The Signal Rule).
- **Don't** add shadows to cards or combine a ring with a shadow (The Quiet Hull Rule).
- **Don't** use coloured `border-left` stripes on cards, alerts or list items.
- **Don't** use eyebrow/kicker labels above headings, or big-number "hero metric" tiles as the dashboard's structure.
- **Don't** use monospace for anything except technical identifiers.
- **Don't** open a modal for a task that can be done inline; reserve dialogs for confirmation of destructive actions.
