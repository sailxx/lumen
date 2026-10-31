#!/usr/bin/env bash
# Сборка и установка расширения «Monitor Brightness (DDC/CI)» на Fedora + GNOME.
# Запускать НА FEDORE из папки extension/:   ./install.sh
set -euo pipefail
cd "$(dirname "$0")"

UUID=$(sed -n 's/.*"uuid": *"\([^"]*\)".*/\1/p' metadata.json | head -n1)
echo "UUID расширения: ${UUID}"

if ! command -v ddcutil >/dev/null; then
    echo "(!) ddcutil не установлен. Сначала запусти ../setup-monitor-brightness.sh"
    exit 1
fi

command -v zip >/dev/null || sudo dnf install -y zip
command -v glib-compile-schemas >/dev/null || sudo dnf install -y glib2-devel

echo "==> Компилирую GSettings-схемы..."
glib-compile-schemas schemas

echo "==> Собираю пакет расширения..."
rm -f "${UUID}.zip"
zip -q -r "${UUID}.zip" metadata.json extension.js prefs.js stylesheet.css schemas

echo "==> Устанавливаю..."
gnome-extensions install --force "${UUID}.zip"

# сработает, если Shell уже перезапускался после прошлой установки
gnome-extensions enable "${UUID}" 2>/dev/null || true

cat <<EOF
==========================================================
Установлено! Осталось:

1) Перезапустить GNOME Shell:
     Wayland (по умолчанию в Fedora): выйти из сеанса и зайти снова
     X11: Alt+F2 -> ввести r -> Enter
2) Включить расширение:
     gnome-extensions enable ${UUID}
   (или графически: приложение «Расширения» / Extension Manager)

В верхней панели появится иконка яркости: клик — меню
со слайдером на каждый монитор. Прокрутка колесом на иконке
тоже меняет яркость (последнего тронутого монитора).
==========================================================
EOF
