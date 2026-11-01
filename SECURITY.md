# Security policy

Lumen has no network connection or background service. The extension runs in
the logged-in GNOME Shell session, stores its two preferences through
GSettings, calls logind to adjust a built-in backlight, and starts `ddcutil`
for external monitor control.

The RPM and first-run setup may install a udev rule that tags I2C devices
with `uaccess`. This grants the active local session access to I2C device
nodes so `ddcutil` can communicate with monitors. Review
`rpm/60-monitor-brightness-i2c.rules` before installing if your system has
different device-access requirements.

## Reporting a vulnerability

Use GitHub's private **Security → Report a vulnerability** channel for this
repository. Include the GNOME Shell version, distribution and release,
installation method, output of `ddcutil environment`, and relevant log lines
from `journalctl --user -b _COMM=gnome-shell | grep -i lumen`. Redact monitor
serial numbers before sharing diagnostic output.
