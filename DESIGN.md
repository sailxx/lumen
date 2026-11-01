---
name: Lumen
description: Per-display brightness controls for GNOME Shell.
colors:
  blue: "#2E9BFF"
  blue-light: "#79C8FF"
  blue-deep: "#2188F6"
  background: "#07090D"
  surface: "#10141B"
  surface-raised: "#121821"
  border: "#29313D"
  text: "#F4F7FC"
  text-muted: "#A9B7C7"
typography:
  display:
    fontFamily: "Golos Text, Inter, sans-serif"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.8px"
  body:
    fontFamily: "Inter, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: "JetBrains Mono, Cascadia Code, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "12px"
  md: "16px"
  lg: "22px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "20px 24px"
  pill:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-muted}"
    rounded: "999px"
    height: "28px"
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    height: "56px"
---

# Design System: Lumen

## Overview

**Creative North Star: Tobi’s luminous utility.**

Lumen’s repository graphics follow the user-selected Tobi visual direction: deep near-black surfaces, precise blue light, fine outlines, and clear technical typography. The README is an editorial product surface: a confident statement first, then a product preview, compact actions, and visual explanations of how brightness control works.

Use the same visual language across the README badge, illustration, CTA, and logo artwork. The assets are self-contained SVGs so GitHub can render them without external font or image services.

**Key Characteristics:**
- Near-black surfaces with restrained blue accents.
- Golos Text headlines, Inter supporting copy, JetBrains Mono for technical labels.
- Thin borders and tonal surfaces instead of heavy shadows.
- Short, staggered entrances with a reduced-motion fallback.

## Colors

The palette uses one electric blue accent against cool, low-contrast graphite surfaces.

### Primary
- **Lumen Blue** (#2E9BFF): Brand accent for controls, selected actions, and fine graphic details.
- **Ice Blue** (#79C8FF): Highlight end of gradients and large readable emphasis.
- **Deep Blue** (#2188F6): Gradient base and secondary accent.

### Neutral
- **Night** (#07090D): Main illustration canvas.
- **Graphite** (#10141B): Card surface.
- **Raised Graphite** (#121821): Pills and lifted surface details.
- **Fine Border** (#29313D): Card and control outlines.
- **Soft White** (#F4F7FC): Main text.
- **Mist** (#A9B7C7): Supporting copy.

## Typography

**Display Font:** Golos Text (with Inter, sans-serif fallback)  
**Body Font:** Inter (with Segoe UI, sans-serif fallback)  
**Label/Mono Font:** JetBrains Mono (with Cascadia Code, monospace fallback)

**Character:** Golos Text gives the headline a compact, confident voice. Inter keeps explanatory copy neutral and legible; JetBrains Mono is reserved for measured values, version tags, and technical metadata.

### Hierarchy
- **Display** (700, 38px, 1.18): README hero statement.
- **Headline** (650, 23–25px): Section statements inside artwork.
- **Title** (650, 15–17px): Card and display names.
- **Body** (500, 11.5–14px, 1.55): Explanations and captions in artwork.
- **Label** (600, 9.5–10.5px, 1.4): Compact uppercase metadata and numeric values.

## Layout

README illustrations use a centered 880px viewBox, with 32–40px outer insets and a consistent 8px spacing rhythm. A wide canvas supports asymmetric feature panels; compact status badges and action buttons keep a single horizontal row. The README itself remains linear and responsive as GitHub scales each SVG to the available width.

## Elevation & Depth

The artwork is flat by default. Depth comes from low-contrast graphite layers, fine outlines, and a restrained radial blue glow. Avoid heavy drop shadows; they make compact cards feel disconnected from the canvas.

## Shapes

Cards use 16–22px corners, compact surfaces use pill corners, and strokes stay thin and quiet. The logo combines a monitor outline with a brightness track and a single clear control point.

## Components

### Chips
- **Style:** Graphite surface, thin border, muted text, small blue status dot.
- **State:** A single blue gradient fill identifies the emphasized version or action.

### Cards / Containers
- **Corner Style:** 16–22px.
- **Background:** Graphite on night canvas; raised graphite for secondary groups.
- **Shadow Strategy:** No cast shadow; use tonal separation and outline.
- **Border:** 1–1.25px fine border.
- **Internal Padding:** 20–24px.

### README Motion
- **Entrance:** Fade and rise 12px over 680ms, with short stagger intervals.
- **Accent:** Slow, subtle opacity pulse on small decorative highlights.
- **Accessibility:** Every animated SVG includes `prefers-reduced-motion: reduce`; the reduced-motion state shows all content immediately.

## Do's and Don'ts

### Do:
- **Do** keep the user-selected Tobi direction: graphite, blue light, thin borders, and compact technical labels.
- **Do** bundle fonts into SVGs so the artwork renders consistently on GitHub without external requests.
- **Do** keep display values and system details in JetBrains Mono.
- **Do** make motion brief and ensure a reduced-motion presentation.

### Don't:
- **Don't** add Russian text to repository-facing copy; the README is English-only.
- **Don't** use the mono face for paragraphs or promotional headlines.
- **Don't** rely on large shadows, rainbow gradients, or generic repeated card grids.
- **Don't** hide essential content behind animation; initial SVG content must remain understandable without motion.
