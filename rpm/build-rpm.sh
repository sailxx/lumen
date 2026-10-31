#!/usr/bin/env bash
# Сборка RPM-пакета расширения «Lumen — Monitor Brightness».
# Запускать НА FEDORE из папки rpm/:   ./build-rpm.sh
set -euo pipefail
cd "$(dirname "$0")"

NAME=gnome-shell-extension-lumen
VERSION=1
UUID=lumen@vlad

command -v rpmbuild >/dev/null || sudo dnf install -y rpm-build

# --- staging: собираем исходники в %{name}-%{version}/ для tarball ---
STAGE_ROOT=$(mktemp -d)
trap 'rm -rf "$STAGE_ROOT"' EXIT
STAGE="$STAGE_ROOT/$NAME-$VERSION"
mkdir -p "$STAGE/schemas"

cp ../extension/metadata.json ../extension/extension.js \
   ../extension/prefs.js ../extension/stylesheet.css "$STAGE/"
cp ../extension/schemas/*.gschema.xml "$STAGE/schemas/"
cp ../LICENSE "$STAGE/"
cp 60-monitor-brightness-i2c.rules i2c-dev.conf "$STAGE/"

echo "==> Собираю исходный tarball..."
tar -C "$STAGE_ROOT" -czf "$NAME-$VERSION.tar.gz" "$NAME-$VERSION"

# --- rpmbuild с локальным _topdir ---
mkdir -p rpmbuild/{BUILD,RPMS,SOURCES,SPECS,SRPMS}
cp "$NAME-$VERSION.tar.gz" rpmbuild/SOURCES/
cp "$NAME.spec" rpmbuild/SPECS/
rm -f "$NAME-$VERSION.tar.gz"

echo "==> Запускаю rpmbuild..."
rpmbuild --define "_topdir $PWD/rpmbuild" -ba "rpmbuild/SPECS/$NAME.spec"

RPM_PATH=$(ls rpmbuild/RPMS/noarch/$NAME-*.rpm | head -n1)

cat <<EOF
==========================================================
Готово! Собран пакет:
  $RPM_PATH

Установка:
  sudo dnf install "$RPM_PATH"

Если раньше ставил zip-версией (install.sh) — убери её, чтобы не конфликтовала:
  gnome-extensions disable $UUID || true
  rm -rf ~/.local/share/gnome-shell/extensions/$UUID

Затем перезапусти GNOME Shell (Wayland: перелогин; X11: Alt+F2 -> r)
и включи расширение:
  gnome-extensions enable $UUID

Удаление пакета (подчищает всё, включая udev-правило и схему):
  sudo dnf remove $NAME
==========================================================
EOF
