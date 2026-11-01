# Lumen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Improve Lumen's reliability, English-only interface, installation paths, and repository documentation.

**Architecture:** Keep the GNOME Shell extension and its existing native dependencies. Separate monitor/process helpers from menu lifecycle where that improves clarity, use English consistently for user-facing text, and keep ZIP/RPM packaging aligned.

**Tech Stack:** GJS ES modules, GNOME Shell 45–50, GSettings, Bash, RPM, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-01-lumen-redesign.md`

## Global Constraints

- Preserve UUID `lumen@vlad` and schema ID `org.gnome.shell.extensions.monitor-brightness`.
- Preserve GNOME Shell 45–50 support unless API review finds an incompatibility.
- Keep the MIT license and the existing brightness feature set.
- Add no runtime framework or background daemon.
- Do not publish, push, or create a pull request.
- Keep the user interface, schema descriptions, installer messages, comments, and documentation in English; add no Russian translation or Russian-language documentation.
- Do not add or execute automated tests; CI is limited to integrity and packaging checks.

## Review Focus

- Missing `ddcutil`, nonzero exits, empty output, and unrecognized command output must result in a clear unavailable/error state, not a fake brightness value.
- A scan or refresh completing after a newer scan or shutdown must not update obsolete menu rows.
- Displays with absent connector/model data or unexpected value ranges must remain safe and identifiable.
- User-visible text in the extension, preferences, settings schema, and install scripts must be English and clear.
- ZIP and RPM install paths must carry the same executable extension files and schema.

---

### Task 1: Make monitor operations and row lifecycle reliable

**Files:** Modify `extension/extension.js`; create `extension/ddcutil.js` and `extension/backlight.js` if the extraction keeps module boundaries simpler; modify `extension/stylesheet.css` only for state/UI needs.

**Interfaces:** DDC helper exposes `detectMonitors(cancellable)`, `readBrightness(monitor, cancellable)`, and `writeBrightness(monitor, percent, cancellable)`; backlight helper exposes `findInternalBacklight()`, `readInternalBrightness(device)`, and `writeInternalBrightness(device, fraction, cancellable)`.

- [x] Check child exit status and retain useful stderr; reject failed subprocess calls with actionable errors.
- [x] Bound parsed monitor/value data, preserve full model labels for accessibility while allowing visual ellipsis, and handle absent connector/model values.
- [x] Add scan generations or per-operation cancellables so stale discovery and refresh completions cannot mutate current rows.
- [x] Make online/unavailable states reversible; do not leave a default slider value presented as a successful read.
- [x] Debounce internal-panel writes and cancel outstanding timers/operations during rebuild and shutdown.
- [x] Consume panel/row scroll only for supported vertical directions and avoid propagating a handled event.

### Task 2: Standardize English UI and preferences

**Files:** Modify `extension/extension.js`, `extension/prefs.js`, `extension/metadata.json`, and `extension/schemas/org.gnome.shell.extensions.monitor-brightness.gschema.xml`.

- [x] Use consistent English for every user-visible menu, row status, error, preferences string, and metadata description.
- [x] Translate GSettings summaries and descriptions into English; preserve the existing settings IDs, keys, and defaults.
- [x] Disconnect preferences settings handlers when the preferences window closes if the API lifecycle permits; keep settings controls synchronized.
- [x] Keep `scroll-step` within 1–25 and retain the current default of 5.

### Task 3: Align build, install, and RPM assets

**Files:** Modify `extension/install.sh`, `setup-monitor-brightness.sh`, `rpm/build-rpm.sh`, `rpm/gnome-shell-extension-lumen.spec`, and `.gitignore`; create shared packaging helper only if both install paths can use it without adding fragile coupling.

- [x] Keep generated schema artifacts out of source control and clean temporary build products on success or failure.
- [x] Make setup prerequisites and permissions detection accurate across the documented distributions; fail early with actionable messages on unsupported package managers.
- [x] Remove any installer behavior that silently claims a failed install succeeded; keep privileged operations explicit.
- [x] Ensure RPM file lists, runtime requirements, package description, and changelog match the delivered assets and supported feature set.

### Task 4: Improve English repository docs and add integrity workflow

**Files:** Modify `README.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`; create `.github/workflows/quality.yml`; update artwork only if current images contradict the revised behavior.

- [x] Rewrite the README around a clear summary, prerequisites, quick install, use, troubleshooting, development, and uninstall; remove stale claims and roadmap promises.
- [x] Ensure remaining repository guidance and script output is consistently English; do not add Russian-language docs.
- [x] Add CI checks for shell syntax, metadata JSON, strict GSettings schema compilation, and ZIP/RPM staging contents without running automated tests.
- [x] Keep badges and screenshots/illustrations consistent with the actual shipped feature set.

### Task 5: Final repository review

**Files:** Review all changed files and packaging manifests.

- [x] Inspect `git diff --check`, full diff, generated-file exclusions, and README commands for consistency.
- [x] Run only non-test syntax/build/integrity checks available in the environment; record unavailable platform-specific checks.
- [x] Confirm no credentials, machine-specific output, test additions, or outbound publication actions are present.
