#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
"$ROOT/macos/build-app.sh"
mkdir -p "$HOME/Applications"
ditto "$ROOT/macos/build/Lumen.app" "$HOME/Applications/Lumen.app"
open "$HOME/Applications/Lumen.app"
echo "Installed Lumen in ~/Applications."
