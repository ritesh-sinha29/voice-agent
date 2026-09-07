# Replora Voice Studio — Design System Contract & Specification

This document serves as the strict, immutable implementation contract for the visual design, token hierarchy, component anatomy, typography, interaction states, accessibility, and motion standards of the **Replora Voice Studio**.

---

## 1. Visual Direction: Warm Editorial Cream

The interface departs entirely from generic dark themes, neon borders, and translucent glassmorphism fog. It delivers an editorial, tactile, high-trust experience designed for enterprise communications, telecom operators, and AI engineers.

### Core Token Palette

| Token Key | HEX Code | Role & Description |
| :--- | :--- | :--- |
| `canvas` | `#FBF7EF` | Primary canvas / page background (warm cream) |
| `surface` | `#FFFDF8` | Elevated ivory card, table container, and modal body |
| `surface-muted`| `#F3EBDD` | Secondary panel, card inset, code block, table header |
| `ink` | `#201A17` | High-contrast espresso body text and display headings |
| `ink-muted` | `#70645B` | Warm gray secondary labels, subtitles, timestamps, borders |
| `border` | `#DED2C2` | Sand hairline dividers, card borders (1px solid) |
| `accent` | `#A8743B` | Restrained bronze for primary actions, active tabs, highlights |
| `accent-soft` | `#EAD9BF` | Champagne badge background, subtle hover fills |
| `success` | `#416B57` | Muted forest green for connected status, positive trends |
| `warning` | `#A56B2C` | Warm amber for warnings, review flags, degraded states |
| `danger` | `#9B4D45` | Clay red for error badges, destructive actions, dropped calls |

---

## 2. Typography Hierarchy

1. **Display & Section Headings**:
   - Font Family: `Newsreader`, `Playfair Display`, `Instrument Serif`, or `Georgia, serif`.
   - Characteristics: Elegant optical weight, refined kerning, restrained line-height (1.15 to 1.25), dignified letterforms.
   - Scale:
     - `h1`: 2.25rem (36px) / 1.2 line-height / semi-bold (600)
     - `h2`: 1.75rem (28px) / 1.25 line-height / medium (500)
     - `h3`: 1.25rem (20px) / 1.3 line-height / medium (500)
2. **Product UI & Tabular Data**:
   - Font Family: `Plus Jakarta Sans`, `Inter`, or system `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
   - Characteristics: High x-height, open apertures, tabular lining figures for numbers (`font-variant-numeric: tabular-nums`).
   - Scale:
     - Body regular: 0.9375rem (15px) / 1.5 line-height
     - Body small / Meta: 0.8125rem (13px) / 1.4 line-height
     - Caption / Mono: 0.75rem (12px) / 1.4 line-height (`JetBrains Mono`, `ui-monospace`, `monospace`)

---

## 3. Spatial System & Geometry

- **Grid Discipline**: Rigid 8px spacing system (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
- **Corner Radii**:
  - Cards & Panels: `16px` (`--radius-card`)
  - Modals & Sheets: `18px` (`--radius-modal`)
  - Controls, Inputs & Buttons: `12px` (`--radius-control`)
  - Badges & Pills: `9999px` (`--radius-pill`)
- **Borders & Shadows**:
  - Borders: Strict 1px solid `var(--color-border)`. Never multiple thick borders.
  - Shadows: Soft, diffuse, warm shadows:
    - Shadow Default: `0 2px 8px rgba(32, 26, 23, 0.04), 0 1px 2px rgba(32, 26, 23, 0.03)`
    - Shadow Hover: `0 6px 20px rgba(32, 26, 23, 0.06), 0 2px 6px rgba(32, 26, 23, 0.04)`
    - Shadow Modal: `0 16px 40px rgba(32, 26, 23, 0.10), 0 4px 12px rgba(32, 26, 23, 0.06)`

---

## 4. Component Standards

1. **Icons**:
   - Strict rule: Lucide SVG icons only. No emojis anywhere in the user interface.
   - Stroke width: 1.75px. Standard icon sizes: 16px, 18px, 20px.
2. **Buttons**:
   - **Primary Action**: Bronze background (`var(--color-accent)`), white/ivory text, tactile pressed micro-scale (`transform: translateY(1px)`).
   - **Secondary Action**: Elevated ivory surface, hairline sand border, espresso text, subtle champagne hover.
   - **Destructive**: Clay red tinted border & text, red soft fill on hover.
3. **Data Visualizations (Recharts Contract)**:
   - Palette: Restrained series colors:
     - Series A (Volume/Calls): `#A8743B` (Bronze)
     - Series B (Answered/Success): `#416B57` (Forest)
     - Series C (Cost/Trend): `#A56B2C` (Amber)
     - Series D (Drops/Loss): `#9B4D45` (Clay)
   - Cartographic grid: `#EAD9BF` with opacity 0.4.
   - Tooltips: Elevated ivory card (`#FFFDF8`), sand border, dark espresso text. No default blue/neon tooltips.
   - Full accessible fallback: Toggleable structured data table.

---

## 5. Live Voice Session "Talk to It" Interaction Model

```
           ┌──────────────────────────────────────────────┐
           │                   IDLE                       │
           └──────────────────────┬───────────────────────┘
                                  │ Start Gesture
                                  ▼
           ┌──────────────────────────────────────────────┐
           │            REQUESTING_PERMISSION             │
           └──────────────────────┬───────────────────────┘
                                  │ Mic Granted
                                  ▼
           ┌──────────────────────────────────────────────┐
           │                  CONNECTING                  │
           └──────────────────────┬───────────────────────┘
                                  │ WebSocket Ready
                                  ▼
                     ┌──────────────────────────┐
                     │        LISTENING         │◄─────────┐
                     └────────────┬─────────────┘          │
                                  │ Speech Detected        │
                                  ▼                        │ Turn Done /
                     ┌──────────────────────────┐          │ Barge-In Stop
                     │         THINKING         │          │
                     └────────────┬─────────────┘          │
                                  │ Stream Chunks          │
                                  ▼                        │
                     ┌──────────────────────────┐          │
                     │         SPEAKING         │──────────┘
                     └──────────────────────────┘
```

- **Single Click Session**: Exactly one button starts continuous streaming. No per-turn push-to-talk.
- **Microphone Management**: `getUserMedia` runs once. Tracks are released immediately upon session termination or tab unmount.
- **Interruption SLA**: Server cancellation and client-side audio buffer discard within **< 250 ms**.

---

## 6. Multi-Tenancy & Authorization Rules

1. **Active Context**: All UI views display the active Organization name and User Role badge (`Owner`, `Admin`, `Operator`, `Analyst`, `Viewer`).
2. **Context Switching**: Changing organizations clears caches, disconnects active WebSocket calls, resets form states, and reloads tenant-isolated data.
3. **Secret Masking**: Sensitive fields (`API Keys`, `Auth Tokens`, `SIP Passwords`) display only the trailing 4 characters with a copy-to-clipboard action and re-enter modal.

---

## 7. Accepted Design Debt

- Dark-mode toggle is intentionally disabled to preserve the editorial warm cream aesthetic across all views.
- Mobile screens under 375px collapse secondary telemetry columns in tables to maintain touch target compliance (min 44x44px).
