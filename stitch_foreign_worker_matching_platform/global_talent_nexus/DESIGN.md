---
name: Global Talent Nexus
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#40484c'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#70787d'
  outline-variant: '#bfc8cd'
  surface-tint: '#1e667f'
  primary: '#004357'
  on-primary: '#ffffff'
  primary-container: '#0d5c75'
  on-primary-container: '#93d3ef'
  inverse-primary: '#90cfec'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#613200'
  on-tertiary: '#ffffff'
  tertiary-container: '#834500'
  on-tertiary-container: '#ffbc87'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bde9ff'
  primary-fixed-dim: '#90cfec'
  on-primary-fixed: '#001f2a'
  on-primary-fixed-variant: '#004d64'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers an enterprise-grade, high-trust digital ecosystem engineered specifically for cross-border recruitment, visa compliance validation, and algorithmic workforce matching. The tone bridges institutional credibility with high-velocity SaaS efficiency.

### Visual Style
The interface uses a **Modern Corporate & Precise Data Density** paradigm. It rejects frivolous ornamentation in favor of razor-sharp structural delineation, functional white space, and low-noise surfaces. Key characteristics:
- Crisp 1px structural dividing lines for complex dashboards and multi-column application tracking.
- Subtle, cool-tinted elevation tiers that maintain strict contrast across multi-language datasets.
- Clean typography hierarchy balancing dense tabular data with reassuring, accessible onboarding layouts.

### Emotional Target
- **For Foreign Jobseekers:** Clear legibility, safety, official transparency, and intuitive self-service pathways that demystify legal employment in Korea.
- **For Korean Employers:** Data-dense efficiency, rigorous candidate qualification clarity, automated administrative relief, and institutional reliability.

## Colors

The palette establishes statutory trust, data clarity, and high-contrast accessibility across both English and Korean typography.

### Role Allocations
- **Primary (`#0D5C75` - Deep Forest Marine):** Signifies legal compliance, stability, institutional strength, and permanent actions (primary CTAs, portal headers, main navigation, verified credentials).
- **Secondary (`#0284C7` - Tech Cyan Accent):** Governs AI precision indicators, matching percentage tags, real-time status pulses, interactive focus states, and algorithmic scorecards.
- **Tertiary (`#D97706` - Warm Amber):** Reserved for point balances, urgent visa expiration alerts, premium badge endorsements, and actionable attention notices.
- **Neutral (`#475569` - Slate Neutral):** Powers crisp typography, muted labels, subtle borders (`#E2E8F0`), and resting canvas tiers (`#F8FAFC` base, `#FFFFFF` cards).

### Semantic and Functional Mapping
- **Success/Verified:** Emerald `#059669` (Visa approved, document verified).
- **Warning:** Amber `#D97706` (Visa expiring within 60 days, missing documentation).
- **Critical/Destructive:** Crimson `#DC2626` (Compliance violation, rejected match).
- **Information:** Cobalt `#2563EB` (Policy update, system notice).

## Typography

The type system prioritizes dual-script legibility across both Latin and Hangul glyph sets. Plus Jakarta Sans handles Latin display, body, and UI labels, paired with Pretendard for Korean glyph fallback.

### Execution Rules
- **Numerical and Matching Metrics:** Metric percentages (e.g., "98% AI Match") and wage representations must use medium or semibold weights with tabular numerical alignment to eliminate jitter in live-updating dashboards.
- **Multilingual Density Balance:** Korean copy displays visually denser than English. Body copy must maintain a minimum 1.5x line-height ratio (`body-md` at 22px height on 14px size) to avoid stroke collisions in complex Hangul characters.
- **Micro-Copy & Legal Badges:** Visa categories (E-9, E-7-1, F-4, H-2) must always render using `label-sm` with uppercase transformation and a subtle letter spacing of `0.04em` for rapid scanning.

## Layout & Spacing

A desktop-first, structured 12-column responsive layout built for complex data visualization, talent grids, and dual-sidebar candidate pipeline management.

### Grid Layout Architecture
- **Desktop (≥1280px):** 12-column grid, 1200px to 1440px max-width container, 24px (`1.5rem`) gutter, 32px (`2rem`) outer margin. Dashboard shells utilize a fixed 260px primary navigation rail alongside a fluid content workspace.
- **Tablet (768px - 1279px):** 8-column grid, fluid width with 20px gutter and 24px margins. Navigation collapes into an off-canvas drawer or compact 72px icon rail.
- **Mobile (<768px):** 4-column grid, fluid width, 16px gutter, 16px outer margin. Dual-column matching cards collapse into full-width stacked list items.

### Spacing Principles
- Spacing relies strictly on an 8-point base grid (using `0.25rem` / 4px as half-step increments).
- `space-xs` (4px) and `space-sm` (8px) are locked to icon-to-label gaps, chip padding, and compact table cells.
- `space-md` (16px) governs standard container padding, card internals, and field groups.
- `space-lg` (24px) and `space-xl` (40px) demarcate distinct semantic blocks within verification workflows and portal views.

## Elevation & Depth

This design system expresses spatial hierarchy through **Tonal Layering and Precision Outlines**, avoiding heavy shadows that compromise data readability.

### Depth Hierarchy
1. **Canvas (Base 0):** Hex `#F8FAFC`. The foundational canvas layer for the entire application.
2. **Surface Low (Tier 1):** Hex `#FFFFFF` with a crisp 1px perimeter outline (`#E2E8F0`). Used for standard candidate cards, posting summaries, and search filter panels.
3. **Surface Raised (Tier 2 - Hover & Dropdowns):** Hex `#FFFFFF` accompanied by an ambient, cool-tinted shadow: `0 4px 16px -2px rgba(13, 92, 117, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)`. Outlines shift to `#CBD5E1`.
4. **Surface Floating (Tier 3 - Modals & AI Drawer):** Hex `#FFFFFF` with elevated depth: `0 16px 36px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`. Background backdrop uses `#0F172A` at 45% opacity with 4px backdrop blur.

### Outlines as Structure
Cards, search filters, and tabular modules rely primarily on sharp structural borders (`1px solid #E2E8F0`) rather than drop shadows. This maintains sharp optical boundaries even on lower-cost monitors frequently used in factory and manufacturing hiring offices.

## Shapes

The design system adopts a **Soft (`1`)** shape profile (`0.25rem` / 4px default radius, `0.5rem` / 8px for cards and containers, `0.75rem` / 12px for high-level modals).

### Geometric Logic
- **Form Controls & Inputs:** 6px corner radius. Delivers a modern, engineered feel that balances warmth with administrative rigor.
- **Cards & Data Modules:** 8px (`rounded-lg`). Retains distinct corners that integrate cleanly with internal horizontal and vertical grid dividers.
- **Match Metric Badges & Status Chips:** Fully pill-rounded (`rounded-full` / 9999px) to immediately distinguish categorical meta-tags and scores from interactive rectangular buttons.

## Components

### Buttons
- **Primary Button:** Background `#0D5C75`, text `#FFFFFF`, border none, border-radius 6px, font-weight 600. Hover state darkens to `#0A485C`. Active state `#083B4B`.
- **AI Action / Precision Button:** Background `#0284C7`, text `#FFFFFF`, subtle inner glow. Used exclusively for triggering AI matching, parsing resumes, or generating contract drafts.
- **Secondary Button:** Surface `#FFFFFF`, border `1px solid #CBD5E1`, text `#334155`. Hover state changes background to `#F1F5F9` and border to `#94A3B8`.
- **Tertiary / Ghost Button:** Transparent surface, text `#0D5C75`. Hover state gains `#F0FDF4` or `#F8FAFC`.

### Chips & Badges
- **Visa Status Chip:** Flat tint container. E.g., `E-7 Verified`: background `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`.
- **AI Match Affinity Chip:** Radial-inspired tone. E.g., `94% Match`: background `#F0F9FF`, text `#0369A1`, border `1px solid #BAE6FD`. Displays with a small secondary spark icon.
- **Filter Chip:** Neutral outline with pill shape. Selected state fills with `#0D5C75`, text `#FFFFFF`.

### Input Fields
- **Default State:** Height 42px, surface `#FFFFFF`, border `1px solid #CBD5E1`, border-radius 6px, typography `body-md`. Padding 0 12px.
- **Focus State:** Border shifts to `#0284C7`, accompanied by a 3px outer glow in `rgba(2, 132, 199, 0.15)`. No outline jumping.
- **Language Switcher Field:** Compact segmented control or dual-label dropdown displaying native flag, language code (KO / EN / VN / PH / ID), and toggle arrow.

### Checkboxes & Radios
- **Checkboxes:** 18x18px, 4px border-radius, `1.5px solid #94A3B8`. Selected state fills with `#0D5C75`, displays a white vector checkmark.
- **Radio Buttons:** 18x18px circular, `1.5px solid #94A3B8`. Selected state displays an inner `#0D5C75` 8px dot with 3px white spacing.

### Candidate & Job Posting Cards
- **Card Structure:** 8px border-radius, background `#FFFFFF`, border `1px solid #E2E8F0`. Padding 20px.
- **Internal Partitioning:** Divided into three logical tiers:
  1. Header: Job title / Worker core competency + Country Flag + Visa Type Chip.
  2. Body: Salary/Wage, Location (e.g., Gyeonggi Hwaseong), Korean Proficiency Level (TOPIK Score badge), Accommodation status.
  3. Footer: AI Fit Score bar, verification timestamp, and single-click Action CTA ("Interview Request" or "Quick Apply").

### Specialized Component: Visa Verification Shield
- Dedicated status indicator placed on worker profiles: displays an emerald or amber shield icon, legal validity dates, and clear verification source (e.g., "HiKorea Ministry of Justice Verified").