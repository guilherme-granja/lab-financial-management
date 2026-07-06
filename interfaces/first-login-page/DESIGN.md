---
name: Finanças Pro
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff516a'
  on-tertiary-container: '#5b0017'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  currency-display:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 20px
  sidebar-width: 240px
---

## Brand & Style

The design system embodies a **Modern Corporate** aesthetic with a focus on high-performance financial management. It prioritizes data clarity and user confidence through a sophisticated dark-mode environment. The brand personality is professional, secure, and technologically advanced, targeting users who value precision and "intelligence" in their financial oversight.

The visual style utilizes a mix of deep tonal layering and vibrant functional accents. It avoids unnecessary decorative elements, opting for a clean, systematic approach where hierarchy is established through color contrast and subtle surface elevation rather than heavy borders or shadows.

## Colors

This design system utilizes a dark-first palette to reduce eye strain and highlight critical financial data.

- **Primary (#6366f1):** An indigo-violet used for primary actions, active navigation states, and brand-level iconography.
- **Success/Danger/Warning:** High-vibrancy green (#10b981), red (#f43f5e), and amber (#eab308) are used strictly for semantic meaning—indicating positive balances, expenses, and pending tasks.
- **Neutrals:** The background uses a deep charcoal/navy (#0f172a). Surfaces and containers use semi-transparent overlays or slightly lighter values to create depth without losing the "void" feel of the interface.
- **Text:** Primary text is off-white for high legibility, while secondary labels use muted grays to recede.

## Typography

The system relies on **Inter** for its neutral, systematic character and exceptional legibility at small sizes. 

- **Scale:** A tight scale is used to accommodate data-heavy dashboards. Headlines are bold and slightly condensed in tracking to feel modern.
- **Labels:** Small labels use uppercase styling with increased letter spacing for the "Security" footers and input headers, ensuring they are readable despite their small footprint.
- **Currency:** Numeric data should always use tabular lining (monospaced numbers) if available to ensure columns of figures align perfectly in lists and cards.

## Layout & Spacing

The layout follows a **Fluid Grid** model for the main dashboard content, balanced by a fixed left-hand navigation sidebar.

- **Sidebar:** A narrow, vertical navigation bar (240px) persists on the left, housing the logo and primary modules.
- **Dashboards:** A 12-column grid is used for the main workspace. Small metric cards typically span 3 columns (4 per row), while primary charts span 6 or 12 columns.
- **Density:** The system uses a "Medium-Compact" density. Gutters are kept at 20px to allow data to feel connected but distinct. Margins around the main content area are 32px to provide breathing room against the dark background.

## Elevation & Depth

Hierarchy is established via **Tonal Layers** rather than physical shadows. 

1. **Background:** The base canvas is the darkest value (#0b0f1a).
2. **Cards/Containers:** Surfaces sit one level above the background using a slightly lighter fill or a subtle 1px stroke (opacity 10%) to define boundaries.
3. **Inputs:** Input fields are recessed, using a darker fill than the card they sit on to create a "punched-out" effect.
4. **Active States:** High-contrast primary color (#6366f1) is used for active states, creating the highest point of visual focus without needing Z-axis elevation.

## Shapes

The shape language is **Rounded**, striking a balance between the precision of finance and the approachability of modern software.

- **Standard Radius:** 0.5rem (8px) for cards and primary buttons.
- **Input Radius:** 0.375rem (6px) for form elements to feel slightly more precise.
- **Active Indicators:** Navigation pills use a fully rounded (pill-shaped) end on one side or a soft 8px radius to highlight selections.

## Components

- **Buttons:** Primary buttons are solid Indigo (#6366f1) with white text and a right-pointing arrow icon for "forward" actions. Secondary buttons use a ghost style with a subtle border.
- **Cards:** Metric cards feature a title in the top left, a semantic icon in the top right, and large-scale currency values in the center-left. They should include a subtle 1px border (#ffffff10).
- **Input Fields:** Feature a dark background, a leading icon (e.g., Mail or Lock), and a placeholder color with low contrast. The focus state should highlight the border or icon in the primary color.
- **Sidebar Nav:** Items consist of a leading icon and text. The active state uses a subtle primary-colored background tint and a vertical bar or high-contrast text color.
- **Footers:** Small, centered, uppercase text with high letter spacing (0.1em) for legal and security disclaimers, rendered in a muted gray.