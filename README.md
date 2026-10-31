# ☀️ Lumen

**Per-monitor brightness for GNOME Shell.** Один слайдер на каждый монитор — встроенный экран ноутбука и внешние по HDMI/DP/USB-C — прямо в меню на верхней панели. Нативный дизайн GNOME, без root.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45--50-blueviolet)](extension/metadata.json)
[![Packaged: RPM](https://img.shields.io/badge/packaging-RPM-blue)](rpm/)

[Русский](#русский) · [English](#english)

<!-- TODO: скриншот меню (добавить после установки на Fedora) -->

---

## Русский

### Как работает

GNOME «из коробки» меняет яркость только встроенного экрана. Lumen добавляет индикатор ☀ на верхнюю панель: клик — меню со слайдером на каждый монитор.

- **встроенный экран** — подсветка sysfs, управление через logind (без root, остаётся в синхроне с системным слайдером);
- **внешние мониторы** — протокол DDC/CI через `ddcutil`; обращение по номеру i2c-шины (быстро, без rescана), записи с debounce 150 мс;
- **прокрутка колесом по иконке** — яркость последнего монитора (шаг настраивается);
- «Обновить мониторы» — пересканировать после подключения/отключения;
- «Настройки» — показать/скрыть встроенный экран, шаг прокрутки.

### Установка — RPM (рекомендуется на Fedora)

```bash
cd rpm
./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
# перезапуск Shell (Wayland — перелогин; X11 — Alt+F2 → r), затем:
gnome-extensions enable lumen@vlad
```

Пакет сам ставит всё: расширение в `/usr/share/gnome-shell/extensions/`,
GSettings-схему системно, udev-правило `uaccess` (DDC/CI без root и без
группы `i2c`), автозагрузку модуля `i2c-dev` и зависимости (`ddcutil`).
Удаление — `sudo dnf remove gnome-shell-extension-lumen`, подчищает всё.

### Установка — zip (в профиль пользователя)

```bash
./setup-monitor-brightness.sh   # ddcutil + права на /dev/i2c-*
# перелогин, затем:
cd extension && ./install.sh
gnome-extensions enable lumen@vlad
```

### Проверка DDC/CI руками

```bash
ddcutil detect                  # список мониторов
ddcutil getvcp 10               # текущая яркость
ddcutil setvcp 10 40 --bus 6    # выставить 40% конкретной шине i2c
```

### Если внешний монитор не находится / не управляется

| Причина | Решение |
|---|---|
| В мониторе выключен DDC/CI | Кнопочное меню монитора → System/Input → **DDC/CI → On** (частый случай) |
| NVIDIA (проприетарный драйвер) | `sudo grubby --update-kernel=ALL --args="nvidia-drm.modeset=1"` и перезагрузка |
| Монитор через док-станцию/хаб | «Обновить мониторы» в меню или повторный `ddcutil detect` |
| Права i2c не применились | Перелогинься (uaccess выдаётся активному сеансу) |

Диагностика: `ddcutil environment`.
Логи расширения: `journalctl --user -b /usr/bin/gnome-shell | grep -i lumen`.

### Удаление

```bash
# RPM-версия:
sudo dnf remove gnome-shell-extension-lumen

# zip-версия:
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

---

## English

Lumen is a GNOME Shell extension (written from scratch) that adds a panel
indicator with a **brightness slider for every monitor**: the internal
laptop panel (via logind, no root) and external displays over **DDC/CI**
(via `ddcutil`). Native GNOME widgets, live sliders, mouse-wheel control
right on the panel icon, per-monitor rescan and settings.

- GNOME Shell **45–50** (Fedora 41–44 and other distros)
- RPM packaging for Fedora included (`rpm/build-rpm.sh`): ships a system-wide
  GSettings schema, a udev `uaccess` rule (DDC/CI without root or the `i2c`
  group), `i2c-dev` modules-load config, and pulls in `ddcutil` as a dependency
- Manual zip install also available (`extension/install.sh`)

Quick DDC/CI sanity check:

```bash
ddcutil detect
ddcutil setvcp 10 40 --bus 6
```

Troubleshooting: make sure **DDC/CI is enabled in your monitor's OSD menu**;
on proprietary NVIDIA drivers `nvidia-drm.modeset=1` is required.

---

## Лицензия / License

[MIT](LICENSE) © Vlad
