#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
UUID="$(sed -nE 's/^[[:space:]]*"uuid":[[:space:]]*"([^"]+)".*/\1/p' "$SCRIPT_DIR/metadata.json" | head -n1)"

if [[ -z "$UUID" ]]; then
    echo "Could not read the extension UUID from metadata.json." >&2
    exit 1
fi

if ! command -v gnome-extensions >/dev/null 2>&1; then
    echo "gnome-extensions was not found. Run this installer in a GNOME Shell session." >&2
    exit 1
fi

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$TEMP_DIR"' EXIT
"$SCRIPT_DIR/package.sh" "$TEMP_DIR/$UUID.zip"
gnome-extensions install --force "$TEMP_DIR/$UUID.zip"

cat <<EOF
Lumen has been installed.

Enable it after restarting GNOME Shell:
  gnome-extensions enable $UUID

On Wayland, sign out and back in to restart GNOME Shell. On X11, press
Alt+F2, enter r, and press Enter.
EOF
