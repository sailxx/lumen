#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
NAME=gnome-shell-extension-lumen
UUID="$(sed -nE 's/^[[:space:]]*"uuid":[[:space:]]*"([^"]+)".*/\1/p' "$ROOT_DIR/extension/metadata.json" | head -n1)"
VERSION="$(sed -nE 's/^[[:space:]]*"version":[[:space:]]*([0-9]+).*/\1/p' "$ROOT_DIR/extension/metadata.json" | head -n1)"

if [[ -z "$UUID" || -z "$VERSION" ]]; then
    echo "Could not read the UUID or version from extension/metadata.json." >&2
    exit 1
fi

if ! command -v rpmbuild >/dev/null 2>&1; then
    echo "rpmbuild is required. On Fedora, install it with: sudo dnf install rpm-build" >&2
    exit 1
fi

STAGE_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$STAGE_ROOT"' EXIT
STAGE="$STAGE_ROOT/$NAME-$VERSION"
mkdir -p -- "$STAGE"

while IFS= read -r relative_path || [[ -n "$relative_path" ]]; do
    [[ -z "$relative_path" || "$relative_path" == \#* ]] && continue
    source_path="$ROOT_DIR/extension/$relative_path"
    if [[ ! -f "$source_path" ]]; then
        echo "Package manifest entry is missing: $relative_path" >&2
        exit 1
    fi
    mkdir -p -- "$STAGE/extension/$(dirname -- "$relative_path")"
    cp -- "$source_path" "$STAGE/extension/$relative_path"
done < "$ROOT_DIR/extension/extension-files.txt"

cp -- "$ROOT_DIR/LICENSE" "$STAGE/"
cp -- "$SCRIPT_DIR/60-monitor-brightness-i2c.rules" "$STAGE/"
cp -- "$SCRIPT_DIR/i2c-dev.conf" "$STAGE/"
SOURCE_TARBALL="$STAGE_ROOT/$NAME-$VERSION.tar.gz"
tar -C "$STAGE_ROOT" -czf "$SOURCE_TARBALL" "$NAME-$VERSION"

TOPDIR="$SCRIPT_DIR/rpmbuild"
mkdir -p -- "$TOPDIR/BUILD" "$TOPDIR/RPMS" "$TOPDIR/SOURCES" "$TOPDIR/SPECS" "$TOPDIR/SRPMS"
cp -- "$SOURCE_TARBALL" "$TOPDIR/SOURCES/"
sed "s/^Version:.*/Version:        $VERSION/" \
    "$SCRIPT_DIR/$NAME.spec" > "$TOPDIR/SPECS/$NAME.spec"

rpmbuild --define "_topdir $TOPDIR" -ba "$TOPDIR/SPECS/$NAME.spec"

RPM_PATH="$(find "$TOPDIR/RPMS/noarch" -maxdepth 1 -type f -name "$NAME-$VERSION-1*.rpm" -print -quit)"
if [[ ! -f "$RPM_PATH" ]]; then
    echo "rpmbuild completed but the expected RPM was not created." >&2
    exit 1
fi

cat <<EOF
RPM package created:
  $RPM_PATH

Install it with:
  sudo dnf install "$RPM_PATH"

After installation, restart GNOME Shell and enable Lumen:
  gnome-extensions enable $UUID

On Wayland, sign out and back in to restart GNOME Shell. On X11, press
Alt+F2, enter r, and press Enter.
EOF
