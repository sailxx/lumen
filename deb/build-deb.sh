#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
META="$ROOT/extension/metadata.json"
VERSION="$(sed -nE 's/^[[:space:]]*"version":[[:space:]]*([0-9]+).*/\1/p' "$META" | head -n1)"
[[ -n "$VERSION" ]] || { echo "Could not read extension version." >&2; exit 1; }
command -v dpkg-deb >/dev/null || { echo "Install dpkg-deb to build the package." >&2; exit 1; }
OUT="${1:-$ROOT/deb/gnome-shell-extension-lumen_${VERSION}_all.deb}"
STAGE="$(mktemp -d)"
trap 'rm -rf -- "$STAGE"' EXIT
EXT="$STAGE/usr/share/gnome-shell/extensions/lumen@vlad"
SCHEMA="$STAGE/usr/share/glib-2.0/schemas"
install -d "$EXT/schemas" "$SCHEMA" "$STAGE/DEBIAN"
while IFS= read -r entry; do
    [[ -z "$entry" || "$entry" == \#* ]] && continue
    install -D -m 0644 "$ROOT/extension/$entry" "$EXT/$entry"
done < "$ROOT/extension/extension-files.txt"
install -m 0644 "$ROOT/extension/schemas/org.gnome.shell.extensions.monitor-brightness.gschema.xml" "$SCHEMA/"
cat > "$STAGE/DEBIAN/control" <<EOF
Package: gnome-shell-extension-lumen
Version: $VERSION
Section: gnome
Priority: optional
Architecture: all
Depends: gnome-shell (>= 45), ddcutil (>= 1.4), i2c-tools
Maintainer: Lumen contributors
Description: Per-display brightness controls for GNOME Shell
 Control built-in and external DDC/CI displays from the GNOME top panel.
EOF
cat > "$STAGE/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
glib-compile-schemas /usr/share/glib-2.0/schemas
exit 0
EOF
cat > "$STAGE/DEBIAN/postrm" <<'EOF'
#!/bin/sh
set -e
if [ -d /usr/share/glib-2.0/schemas ]; then glib-compile-schemas /usr/share/glib-2.0/schemas; fi
exit 0
EOF
chmod 0755 "$STAGE/DEBIAN/postinst" "$STAGE/DEBIAN/postrm"
mkdir -p "$(dirname -- "$OUT")"
dpkg-deb --root-owner-group --build "$STAGE" "$OUT"
echo "Built $OUT"
