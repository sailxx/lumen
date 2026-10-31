#!/usr/bin/env bash
# Настройка управления яркостью ВНЕШНИХ мониторов (DDC/CI) на Fedora + GNOME.
# Запускать НА FEDORA от обычного пользователя (sudo спросит сам, где нужно):
#   chmod +x setup-monitor-brightness.sh && ./setup-monitor-brightness.sh

set -u

if [[ $EUID -eq 0 ]]; then
  echo "Не запускай от root — скрипт сам использует sudo там, где нужно."
  exit 1
fi

echo "==> 1/5. Устанавливаю ddcutil и i2c-tools..."
sudo dnf install -y ddcutil i2c-tools

echo "==> 2/5. Включаю модуль ядра i2c-dev (сейчас и после перезагрузки)..."
sudo modprobe i2c-dev
echo 'i2c-dev' | sudo tee /etc/modules-load.d/i2c-dev.conf >/dev/null

echo "==> 3/5. Настраиваю права доступа к /dev/i2c-* ..."
# Современный ddcutil ставит своё udev-правило (uaccess). Если его нет — создаём своё.
if [ -f /usr/lib/udev/rules.d/60-ddcutil-i2c.rules ] || [ -f /usr/lib/udev/rules.d/60-ddcutil.rules ]; then
  echo "    udev-правило ddcutil уже есть — отлично."
else
  echo 'KERNEL=="i2c-[0-9]*", DRIVERS=="i915|xe|amdgpu|nvidia|nouveau", TAG+="uaccess"' \
    | sudo tee /etc/udev/rules.d/60-ddcutil-i2c.rules >/dev/null
  sudo udevadm control --reload-rules
  sudo udevadm trigger
  echo "    Добавлено своё udev-правило с uaccess."
fi

# Классический запасной вариант — группа i2c.
if getent group i2c >/dev/null; then
  sudo usermod -aG i2c "$USER"
  echo "    Пользователь добавлен в группу i2c (вступит в силу после перелогина)."
fi

echo "==> 4/5. Ищу мониторы (это занимает несколько секунд)..."
sleep 2
if ddcutil detect; then
  echo "    Мониторы найдены."
else
  echo "(!) Мониторы НЕ найдены. Частые причины:"
  echo "    - В меню самого монитора выключен DDC/CI — включи его кнопками монитора"
  echo "      (обычно: Menu -> System/Input -> DDC/CI -> On)."
  echo "    - NVIDIA: нужно nvidia-drm.modeset=1 (см. README, раздел про NVIDIA)."
  echo "    - Монитор через док/переходник — попробуй запустить 'ddcutil detect' ещё раз."
fi

echo "==> 5/5. Читаю текущую яркость (VCP code 10) со всех найденных мониторов..."
sleep 2
ddcutil getvcp 10 || true

cat <<'EOF'

==========================================================
Почти готово! Осталось два шага:

1) ВЫЙДИ из сеанса и зайди снова (или перезагрузись) —
   иначе права на /dev/i2c-* ещё не применятся.

2) Установи МОЁ расширение Lumen (Monitor Brightness) —
   папка extension/ рядом с этим скриптом:
       cd extension
       ./install.sh
   Дальше перезапусти GNOME Shell и включи расширение
   (подробности — в README.md).

Быстрая проверка из терминала:
   ddcutil setvcp 10 40        # яркость 40% (все мониторы / первый)
   ddcutil setvcp 10 40 -d 2   # конкретно второй монитор
==========================================================
EOF
