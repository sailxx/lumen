# Lumen Redesign Brief

## Goal

Make Lumen a reliable and approachable GNOME Shell extension for controlling the brightness of built-in and external monitors, with a consistent English-only interface and repository.

## Product direction

- Keep GNOME Shell, GJS, logind, DDC/CI, and `ddcutil`; do not add a runtime framework or daemon.
- Use clear English for all user-visible UI, preferences, command-line output, comments, and documentation; do not add Russian translations or Russian-language docs.
- Make device discovery, refresh, errors, and shutdown safe when subprocesses fail, finish late, or are cancelled.
- Keep all packaging routes consistent with the runtime files and schema that the extension needs.
- Keep the README accurate, task-oriented, and explicit about supported platforms and known limitations.

## Scope

Refine the extension's device and process handling, row state, lifecycle, settings UI, and labels; make setup/install scripts safer and clearer; add repository checks for metadata, shell syntax, schemas, and package contents; revise English documentation and align all repository text with the English-only interface.

## Constraints

- Preserve UUID `lumen@vlad` and GSettings schema ID `org.gnome.shell.extensions.monitor-brightness`.
- Preserve GNOME Shell 45–50 compatibility unless source/API review identifies an existing incompatibility.
- Keep the MIT license and existing brightness features.
- Do not publish, push, or create a pull request as part of this work.
- Do not add or execute automated tests; quality workflow checks are limited to packaging, shell syntax, metadata, and schema integrity.

## Success criteria

- Errors from `ddcutil` and logind do not appear as successful brightness reads or stale values.
- Older asynchronous discovery/refresh results cannot mutate rows created by a later scan or after shutdown.
- The interface, settings schema, installer output, and documentation are consistently in English.
- Both supported installation paths include the same runtime files and schema.
- Documentation and automated repository checks describe and enforce the shipped project accurately.
