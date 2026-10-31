# Security policy

Lumen runs entirely as your session user. It writes the laptop backlight
through logind's `SetBrightness`, spawns `ddcutil` to talk to monitors over
DDC/CI, and touches nothing else: no network, no ports, no remote content,
no storage. The RPM ships a udev `uaccess` rule that grants the **active
session** access to `/dev/i2c-*` — the same trust level GNOME gives to
your logged-in user.

## Reporting a vulnerability

Please use GitHub's private channel: **Security → Report a vulnerability**
on this repository. If it does not fit, open a regular issue and mark it
accordingly. Include:

- GNOME Shell version (`gnome-shell --version`)
- Fedora release and whether the extension was installed by RPM or zip
- Output of `ddcutil environment` (redact serial numbers if you like)
- Relevant log lines: `journalctl --user -b /usr/bin/gnome-shell | grep -i lumen`
