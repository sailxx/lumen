#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if (( EUID == 0 )); then
    echo "Run this script as your regular user; it invokes sudo only when needed." >&2
    exit 1
fi

if command -v sudo >/dev/null 2>&1; then
    PRIV=(sudo)
elif command -v doas >/dev/null 2>&1; then
    PRIV=(doas)
else
    echo "sudo or doas is required to install packages and configure the system." >&2
    exit 1
fi

echo "Installing ddcutil and i2c-tools..."
if command -v dnf >/dev/null 2>&1; then
    "${PRIV[@]}" dnf install -y ddcutil i2c-tools
elif command -v apt-get >/dev/null 2>&1; then
    "${PRIV[@]}" apt-get update
    "${PRIV[@]}" apt-get install -y ddcutil i2c-tools
elif command -v pacman >/dev/null 2>&1; then
    "${PRIV[@]}" pacman -S --needed --noconfirm ddcutil i2c-tools
elif command -v zypper >/dev/null 2>&1; then
    "${PRIV[@]}" zypper --non-interactive install ddcutil i2c-tools
elif command -v apk >/dev/null 2>&1; then
    "${PRIV[@]}" apk add --no-cache ddcutil i2c-tools kmod
elif command -v emerge >/dev/null 2>&1; then
    "${PRIV[@]}" emerge --noreplace app-misc/ddcutil sys-apps/i2c-tools
else
    echo "No supported package manager was found (dnf, apt-get, pacman, zypper, apk, or emerge)." >&2
    exit 1
fi

echo "Loading i2c-dev kernel module..."
"${PRIV[@]}" modprobe i2c-dev || true

if [[ -d /etc/modules-load.d ]]; then
    echo "i2c-dev" | "${PRIV[@]}" tee /etc/modules-load.d/lumen-i2c.conf >/dev/null
fi

if ! getent group i2c >/dev/null 2>&1; then
    echo "Creating i2c group..."
    if command -v groupadd >/dev/null 2>&1; then
        "${PRIV[@]}" groupadd -r i2c || true
    elif command -v addgroup >/dev/null 2>&1; then
        "${PRIV[@]}" addgroup -S i2c || true
    fi
fi

echo "Adding $USER to the i2c group..."
if command -v usermod >/dev/null 2>&1; then
    "${PRIV[@]}" usermod -aG i2c "$USER" || true
elif command -v addgroup >/dev/null 2>&1; then
    "${PRIV[@]}" addgroup "$USER" i2c || true
fi

if [[ -d /etc/udev/rules.d ]]; then
    echo "Installing udev rules for i2c access..."
    cat <<'UDEV_INNER' | "${PRIV[@]}" tee /etc/udev/rules.d/99-i2c.rules >/dev/null
KERNEL=="i2c-[0-9]*", GROUP="i2c", MODE="0660"
UDEV_INNER
    if command -v udevadm >/dev/null 2>&1; then
        "${PRIV[@]}" udevadm control --reload-rules || true
        "${PRIV[@]}" udevadm trigger --subsystem-match=i2c-dev || true
    fi
fi

cat <<'MSG_INNER'

Setup complete!
If your user was added to the 'i2c' group, log out and log back in to apply group permissions.
MSG_INNER
