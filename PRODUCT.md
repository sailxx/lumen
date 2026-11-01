# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Linux users running GNOME Shell who want to adjust the brightness of a built-in laptop display and external monitors from the top panel.

## Product Purpose

Lumen provides per-display brightness controls in one GNOME Shell menu. Success means users can find a display, read its current brightness, and adjust it without a background service.

## Positioning

A GNOME Shell extension that controls internal backlights through the session's system interface and external displays through DDC/CI with `ddcutil`.

## Operating Context

Users work from the GNOME top panel on Linux. External display control depends on DDC/CI support and one-time system access setup; brightness changes run in the logged-in session.

## Capabilities and Constraints

- GNOME Shell versions 45 through 50.
- Separate controls for built-in backlights and external DDC/CI monitors.
- No background daemon or network connection.
- English-only UI and repository text, per the user.
- The README is a GitHub-rendered documentation surface. Its graphics must remain self-contained and legible when displayed as SVG images.

## Brand Commitments

The product name is Lumen. For the README redesign, the user explicitly selected the visual language of their Tobi repository as the reference, requested a redesigned logo and pills, animated entrances, and Inter, JetBrains Mono, and fonts already used by Tobi (Golos Text and JetBrains Mono).

## Evidence on Hand

- Functional extension source: `extension/`.
- Existing product artwork and install instructions: `assets/` and `README.md`.
- Tobi README and its artwork builder, inspected in the user's `sailxx/Tobi` repository.

## Product Principles

- Keep each display's control distinct and understandable.
- Explain one-time setup separately from runtime permissions.
- Keep the README useful without requiring external assets to load.
- Make visual motion brief, optional, and secondary to readable content.
