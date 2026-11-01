#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
UUID="$(sed -nE 's/^[[:space:]]*"uuid":[[:space:]]*"([^"]+)".*/\1/p' "$SCRIPT_DIR/metadata.json" | head -n1)"

if [[ -z "$UUID" ]]; then
    echo "Could not read the extension UUID from metadata.json." >&2
    exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
    echo "zip is required. Install it with your distribution's package manager and retry." >&2
    exit 1
fi

if ! command -v glib-compile-schemas >/dev/null 2>&1; then
    echo "glib-compile-schemas is required. Install the GLib development tools and retry." >&2
    exit 1
fi

OUTPUT_PATH="${1:-$SCRIPT_DIR/$UUID.zip}"
OUTPUT_DIR="$(dirname -- "$OUTPUT_PATH")"
OUTPUT_NAME="$(basename -- "$OUTPUT_PATH")"
mkdir -p -- "$OUTPUT_DIR"
OUTPUT_DIR="$(cd -- "$OUTPUT_DIR" && pwd)"

STAGE_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$STAGE_ROOT"' EXIT
STAGE="$STAGE_ROOT/$UUID"
mkdir -p -- "$STAGE"

while IFS= read -r relative_path || [[ -n "$relative_path" ]]; do
    [[ -z "$relative_path" || "$relative_path" == \#* ]] && continue
    source_path="$SCRIPT_DIR/$relative_path"
    if [[ ! -f "$source_path" ]]; then
        echo "Package manifest entry is missing: $relative_path" >&2
        exit 1
    fi
    mkdir -p -- "$STAGE/$(dirname -- "$relative_path")"
    cp -- "$source_path" "$STAGE/$relative_path"
done < "$SCRIPT_DIR/extension-files.txt"

glib-compile-schemas --strict "$STAGE/schemas"
rm -f -- "$OUTPUT_DIR/$OUTPUT_NAME"
(cd -- "$STAGE" && zip -q -r "$OUTPUT_DIR/$OUTPUT_NAME" .)
echo "Created extension archive: $OUTPUT_DIR/$OUTPUT_NAME"
