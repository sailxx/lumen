#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if (( EUID == 0 )); then
    echo "Run this script as your regular user; it invokes sudo only when needed." >&2
    exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required to install packages and configure the system." >&2
    exit 1
fi

echo "Installing ddcutil and i2c-tools..."
if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y ddcutil i2c-tools
elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y ddcutil i2c-tools
elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -S --needed --noconfirm ddcutil i2c-tools
elif command -v zypper >/dev/null 2>&1; then
    sudo zypper --non-interactive install ddcutil i2c-tools
else
    echo "No supported package manager was found (dnf, apt-get, pacman, or zypper)." >&2
    exit 1
fi

echo "Loading i2c-dev and enabling it at boot..."
sudo modprobe i2c-dev
printf '%s\n' 'i2c-dev' | sudo tee /etc/modules-load.d/lumen-i2c-dev.conf >/dev/null

has_ddcutil_rule=false
for rule in \
    /etc/udev/rules.d/60-ddcutil*.rules \
    /usr/lib/udev/rules.d/60-ddcutil*.rules \
    /lib/udev/rules.d/60-ddcutil*.rules \
    /usr/share/udev/rules.d/60-ddcutil*.rules; do
    if [[ -f "$rule" ]]; then
        has_ddcutil_rule=true
        break
    fi
done

if [[ "$has_ddcutil_rule" == true ]]; then
    echo "Found the udev permissions rule provided by ddcutil."
else
    echo "Installing an active-session udev rule for I2C devices..."
    sudo install -D -m 0644 "$SCRIPT_DIR/rpm/60-monitor-brightness-i2c.rules" \
        /etc/udev/rules.d/60-monitor-brightness-i2c.rules
fi

sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=i2c-dev

echo
if ddcutil detect; then
    echo "Display detection completed."
else
    echo "No DDC/CI displays were detected yet. Check the monitor OSD and run 'ddcutil detect' again."
fi

cat <<'EOF'

Setup is complete. Sign out and back in so the new device permissions apply.
Then install the GNOME Shell extension:

  cd extension
  ./install.sh

Enable it after restarting GNOME Shell:
  gnome-extensions enable lumen@vlad

If detection fails, enable DDC/CI in the monitor's on-screen menu. With some
NVIDIA drivers, modesetting may also be required.
EOF
