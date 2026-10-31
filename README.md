<div align="center">

<img src="assets/logo.svg" width="128" alt="Lumen">

# Lumen

**A small sun ☀ that lives in GNOME Shell's top panel and gives every monitor its own brightness slider.**

Click it and a menu drops with a slider for each connected display: the laptop's own panel and externals over HDMI, DisplayPort or USB-C. Drag a slider and the brightness follows live; scroll the panel icon to nudge the last screen without opening the menu; rescan after plugging a screen in, or hide the built-in panel if the system slider is enough.

**No root, no daemon, no accounts. Open source, MIT.**

<img src="https://img.shields.io/badge/version-1-2E9BFF" alt="version 1">
<img src="https://img.shields.io/badge/GNOME_Shell-45%E2%80%9350-2E9BFF" alt="GNOME Shell 45–50">
<img src="https://img.shields.io/badge/packaging-RPM-2E9BFF" alt="RPM packaging">
<img src="https://img.shields.io/badge/backend-ddcutil-2E9BFF" alt="ddcutil backend">
<img src="https://img.shields.io/badge/protocol-DDC%2FCI-2E9BFF" alt="DDC/CI">
<img src="https://img.shields.io/badge/code-MIT-2E9BFF" alt="MIT">
<img src="https://img.shields.io/github/stars/sailxx/lumen?style=flat&logo=github&color=%232E9BFF" alt="Stars">

<br>

<img src="assets/readme/hero-en.svg" width="100%" alt="Lumen: a sun icon in the GNOME top panel with a brightness slider menu for the laptop display and an external monitor">

<a href="#build-rpm"><img src="assets/readme/btn-rpm-en.svg" height="52" alt="Build the RPM"></a>&nbsp;&nbsp;<a href="#install-zip"><img src="assets/readme/btn-zip-en.svg" height="52" alt="Install from zip"></a>&nbsp;&nbsp;<a href="https://github.com/sailxx/lumen/releases/latest"><img src="assets/readme/btn-new-en.svg" height="52" alt="What’s new"></a>

</div>

<br>

<img src="assets/readme/features-en.svg" width="100%" alt="Features: every screen in one menu, drag and scroll, rescan, small settings">

<details>
<summary><b>More about the features</b></summary>

### 🖥 Every screen in one menu

The panel icon opens a menu with a row per display: `Laptop display` and each external by its connector and model, `DP-1 · DELL U2415`. Each row has its own slider and a live percentage; the values refresh every time the menu opens, so a brightness changed from the monitor's own buttons shows up too.

### 🖱 Drag and scroll

Drag a slider and the brightness follows; writes to the monitor are debounced to 150 ms so DDC/CI never chokes. Scroll the wheel right on the panel icon to nudge the last-used screen, or scroll on a row to move only that monitor. The step is configurable (1–25 %).

### 🔁 Plug and replug

Connected a screen, or moved it to another port? **Refresh monitors** rescans without restarting anything. A display that stays silent over DDC/CI gets a disabled row with a dash instead of a fake slider.

### ⚙ Small settings

Two switches, nothing more: show or hide the built-in panel in the menu, and the scroll step. The extension itself is ~400 lines of GNOME Shell JavaScript with native widgets — no bundled UI framework, nothing compiled.

</details>

<br>

<img src="assets/readme/how-en.svg" width="100%" alt="How it works: logind for the laptop panel, DDC/CI via ddcutil for externals, udev uaccess, no daemon">

<details>
<summary><b>Under the hood</b></summary>

- **Laptop panel** — the usual `/sys/class/backlight`, written through logind's `Session.SetBrightness` D-Bus call. No root, and the system brightness slider stays in sync.
- **External monitors** — DDC/CI, VCP code `0x10` (brightness), through `ddcutil`. Displays are detected once; afterwards each write goes straight to the monitor's own i2c bus (`--bus N`), which is one short call instead of a full bus scan.
- **Permissions** — the RPM ships a udev `uaccess` rule, so the active session gets `/dev/i2c-*` access without root and without adding yourself to the `i2c` group. It also loads the `i2c-dev` kernel module at boot.
- **No daemon** — the extension spawns `ddcutil` on demand and cancels it when disabled. Nothing resident, nothing listening.

```bash
ddcutil detect                  # see your displays
ddcutil getvcp 10               # read brightness
ddcutil setvcp 10 40 --bus 6    # set 40% on a specific bus
```

</details>

<br>

<img src="assets/readme/install-en.svg" width="100%" alt="Install: RPM for Fedora, or a zip into your GNOME profile">

**Fedora — RPM.** <a id="build-rpm"></a>The package pulls in `ddcutil`, ships the udev rule and the `i2c-dev` module config, so nothing else to set up:

```bash
git clone https://github.com/sailxx/lumen.git
cd lumen/rpm && ./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
```

Log out and back in (Wayland) or `Alt+F2` → `r` → `Enter` (X11), then:

```bash
gnome-extensions enable lumen@vlad
```

<details>
<summary><b>Any distro — zip</b></summary>
<a id="install-zip"></a>

Installs into `~/.local/share/gnome-shell/extensions/`, no packaging involved:

```bash
./setup-monitor-brightness.sh     # ddcutil + i2c permissions
# log out and back in, then:
cd extension && ./install.sh
gnome-extensions enable lumen@vlad
```

On distros without the `uaccess` rule, add yourself to the `i2c` group: `sudo usermod -aG i2c $USER`, then re-login.

</details>

<details>
<summary><b>Troubleshooting</b></summary>

| Symptom | Fix |
|---|---|
| The monitor does not appear | DDC/CI is often **off by default in the monitor's own OSD menu** — enable it there (System/Input → DDC/CI → On), then **Refresh monitors** |
| NVIDIA card, still missing | Proprietary drivers need modesetting: `sudo grubby --update-kernel=ALL --args="nvidia-drm.modeset=1"` and reboot |
| Through a dock or hub | Sometimes flaky — replug, retry **Refresh monitors** |
| `Permission denied` in `ddcutil detect` | Log out and back in: `uaccess` rights are given to the active session |

Diagnostics: `ddcutil environment`; extension logs: `journalctl --user -b /usr/bin/gnome-shell | grep -i lumen`.

</details>

<details>
<summary><b>Uninstall</b></summary>

```bash
sudo dnf remove gnome-shell-extension-lumen      # RPM: cleans every file, udev rule included
# or, for the zip install:
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

Then restart the Shell (relogin on Wayland, `Alt+F2` → `r` on X11).

</details>

<br>

<img src="assets/readme/numbers-en.svg" width="100%" alt="By the numbers: 0 root, 1 icon, 150 ms debounce, GNOME Shell 45–50">

<br>

<img src="assets/readme/roadmap-en.svg" width="100%" alt="Roadmap and known limits">

<details>
<summary><b>Roadmap &amp; known limits</b></summary>

- The menu speaks **Russian**; an English translation is the first item on the roadmap.
- Not on extensions.gnome.org yet — install from this repo (zip or RPM). Publishing there once it is battle-tested.
- The code targets GNOME Shell 45–50 APIs but has not yet been run long on a live Shell. If a slider misbehaves, please open an issue with the output of `journalctl --user -b /usr/bin/gnome-shell | grep -i lumen`.
- Planned: brightness OSD, keyboard shortcuts, volume over DDC/CI (VCP `0x62`), contrast and gamma rows.

</details>

<details>
<summary><b>Development</b></summary>

```
extension/   the extension itself: extension.js, prefs.js, stylesheet.css, schemas/
rpm/         spec, udev rule, modules-load config, build-rpm.sh
assets/      logo and README images (plain SVG, safe to edit by hand)
```

```bash
cd rpm && ./build-rpm.sh        # build the RPM
cd extension && ./install.sh    # or install the zip locally
```

MIT © Vlad. Built with GNOME Shell's own widgets; `ddcutil` does the talking to the monitors.

</details>

<br>

<div align="center">

☀

**Lumen** — every screen, its own slider.

</div>
