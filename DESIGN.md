---
name: Lab Financial Management
description: Dark, indigo-accented family finance dashboard where numbers stay legible and quiet
colors:
  background: "#111218"
  foreground: "#e1e7ef"
  card: "#181b25"
  card-foreground: "#e1e7ef"
  popover: "#181b25"
  popover-foreground: "#e1e7ef"
  primary: "#6467f2"
  primary-foreground: "#ffffff"
  secondary: "#2e3148"
  secondary-foreground: "#e1e7ef"
  muted: "#2e3148"
  muted-foreground: "#94a3b8"
  accent: "#2e3148"
  accent-foreground: "#e1e7ef"
  destructive: "#ef4343"
  destructive-foreground: "#ffffff"
  border: "#2e3148"
  input: "#2e3148"
  ring: "#6467f2"
typography:
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
---

# Design System: Lab Financial Management

## 1. Overview

**Creative North Star: "The Night Statement"**

The interface reads like a bank statement checked at night: a dim, near-black surface where the only bright thing in the room is the number that matters. Signal Indigo is the single focal accent — it marks the primary action, the active focus ring, the one data point the eye should land on — and everything else recedes into quiet neutral tones. This is a shared household ledger, not a consumer growth app: there are no badges, no confetti, no mascots, and no cheerful SaaS-cream marketing gloss. It is also not a dense trading terminal; density stays casual, legible at a glance by any family member, not optimized for a power user staring at it all day.

**Key Characteristics:**
- Dark-only surface (no light theme); depth built from tone steps, not brightness jumps
- One accent color (Signal Indigo) used sparingly, for action and focus only
- Flat cards distinguished from the page by a single lightness step, not a border-heavy grid
- Inter throughout, no display face — data is the hierarchy, not typographic flourish

## 2. Colors

The palette is a single cool-indigo dark scale: near-black background, a barely-lighter card surface, and one saturated accent reserved for action and emphasis.

### Primary
- **Signal Indigo** (#6467f2): the one color that draws the eye. Used on primary buttons, active focus rings, and the ring/selection state — nowhere else. Restraint is the point.

### Neutral
- **Void Background** (#111218): the base app surface. Everything else sits on top of it.
- **Ledger Card** (#181b25): card, popover, and dialog surfaces — one lightness step above background, enough to separate content without a border.
- **Statement Text** (#e1e7ef): primary foreground text on dark surfaces.
- **Quiet Steel** (#2e3148): secondary/muted/accent surfaces, borders, and input strokes — the workhorse neutral for dividers and inactive UI.
- **Faded Ledger Ink** (#94a3b8): muted foreground text — secondary labels, timestamps, helper copy.
- **Alert Red** (#ef4343): destructive actions and error states only.

### Named Rules
**The One Signal Rule.** Signal Indigo appears only on primary actions, focus/ring states, and active selection. If more than one element on a screen is indigo at rest, it's being used wrong.

## 3. Typography

**Body Font:** Inter (with system-ui, -apple-system fallback)

**Character:** A single geometric-humanist sans carries the whole system — no display face, no serif contrast. The hierarchy comes from weight and size steps, not font pairing, keeping every screen feeling like the same ledger rather than a marketing page in disguise.

### Hierarchy
- **Headline** (600, 1.5rem, line-height 1, letter-spacing -0.02em): card totals, page titles — the numbers that matter most on a screen.
- **Title** (600, 1rem, line-height 1.2): card headers, dialog titles, section labels.
- **Body** (400, 0.875rem, line-height 1.5): table cells, form values, descriptions. Cap prose blocks at 65–75ch.
- **Label** (600, 0.75rem): badges, table headers, small status tags.

### Named Rules
**The Numbers-First Rule.** The largest, boldest type on any screen is always a balance, delta, or total — never a section heading or a piece of UI chrome.

## 4. Elevation

The system uses a consistent soft-shadow vocabulary layered on top of tonal separation: cards and surfaces are lifted off the background with both a lightness step (`--card` vs `--background`) and a small ambient shadow, and dialogs/popovers get a stronger shadow to read clearly as floating above page content.

### Shadow Vocabulary
- **Ambient** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` — Tailwind `shadow-sm`): default resting elevation for cards.
- **Floating** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` — Tailwind `shadow-lg`): dialogs, popovers, and anything rendered above the page in a portal.

### Named Rules
**The Two-Step Rule.** There are exactly two elevation levels: resting (`shadow-sm`) and floating (`shadow-lg`). Nothing in between; don't invent a third shadow weight.

## 5. Components

### Buttons
- **Shape:** rounded corners (6px, `rounded-md`).
- **Primary:** Signal Indigo background, white text, `h-10 px-4 py-2`; hover dims to `bg-primary/90`.
- **Secondary:** Quiet Steel background, Statement Text foreground; hover to `bg-secondary/80`.
- **Outline:** transparent/background fill with a Quiet Steel border; hover fills with the accent tone.
- **Ghost:** no fill or border at rest; hover fills with the accent tone.
- **Destructive:** Alert Red background, white text — reserved for delete/remove actions only.
- **Focus:** 2px ring in Signal Indigo, offset 2px from the button edge.

### Badges
- **Style:** fully rounded (`rounded-full`), small caps-weight label text, no border in the default/secondary/destructive variants.
- **Variants:** default (indigo fill), secondary (steel fill), destructive (red fill), outline (transparent, foreground text, bordered) — used for status tags on transactions and categories.

### Cards / Containers
- **Corner Style:** 8px radius (`rounded-lg`).
- **Background:** Ledger Card (#181b25) against Void Background (#111218).
- **Shadow Strategy:** Ambient shadow at rest (see Elevation).
- **Border:** hairline Quiet Steel border, present but subordinate to the tonal shift.
- **Internal Padding:** 24px (header/content/footer each `p-6`, content drops top padding).

### Inputs / Fields
- **Style:** Void Background fill, Quiet Steel border, 6px radius, `h-10`, `px-3 py-2`.
- **Focus:** border stays, a 2px Signal Indigo ring appears with a 2px offset — no glow/blur effect.
- **Disabled:** 50% opacity, pointer-events removed.
- **Placeholder:** must render at the same muted-foreground contrast as helper text, never lighter.

### Dialogs
- **Style:** Ledger Card background, floating shadow, centered, `sm:rounded-lg`, max-width `lg`.
- **Motion:** fade + zoom-95 → 100 in/out (200ms), no bounce.
- **Close:** top-right icon button, 70% opacity at rest, full opacity on hover/focus.

### Navigation
- Not yet a distinct documented pattern in the current codebase; extract in a follow-up `/impeccable document` pass once a persistent nav shell exists.

## 6. Do's and Don'ts

### Do:
- **Do** keep Signal Indigo (#6467f2) to primary actions, focus rings, and active/selected state only.
- **Do** separate cards from the page with the Ledger Card tone step (#181b25 on #111218) plus the ambient shadow, not a heavier border.
- **Do** keep every loading/error/empty state explicit per project convention — never show ambiguous or stale numbers, matching PRODUCT.md's "trustworthy by default" principle.
- **Do** use the same component pattern (same button variant, same badge shape) for the same kind of action across Accounts, Transactions, Categories, Goals, and Tags.

### Don't:
- **Don't** add playful/gamified fintech flourishes — badges-as-achievements, confetti, mascots, or celebratory animation. This is a shared ledger, not a consumer growth app (per PRODUCT.md anti-references).
- **Don't** push toward a dense trading-terminal look (cramped multi-panel data grids, monospace-everything). This is casual household use, not power-user finance software.
- **Don't** drift toward a cheerful SaaS-cream marketing aesthetic (light warm-neutral hero sections, gradient text, eyebrow labels). This is a product surface, not a landing page.
- **Don't** introduce a second saturated accent color competing with Signal Indigo; Alert Red is the only other saturated color, and it is destructive-only.
- **Don't** render muted-foreground gray (#94a3b8) at a size/weight that drops body text below 4.5:1 contrast against the background.
