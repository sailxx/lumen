# Lumen

**Helligkeitssteuerung für einzelne Displays in GNOME Shell.** Passe das integrierte Laptop-Display und externe DDC/CI-Monitore über das Menü in der oberen Leiste an.

[English](README.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [简体中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md)

<kbd>Jedes Display separat steuern</kbd> <kbd>Internes Display und DDC/CI</kbd> <kbd>Im GNOME-Panel</kbd> <kbd>Per Mausrad anpassen</kbd> <kbd>Kein Hintergrunddienst</kbd> <kbd>Kein Root im Betrieb</kbd>

## Funktionen

- Jedes erkannte Display erhält einen eigenen Helligkeitsregler. Für das interne Display nutzt Lumen die System-Hintergrundbeleuchtung über logind, für externe Monitore `ddcutil` mit DDC/CI. Der aktuelle Helligkeitswert wird vom Display ausgelesen. Ist er nicht verfügbar, zeigt Lumen dies entsprechend an, statt einen Wert zu schätzen.
- Mit dem Mausrad über einer Display-Zeile änderst du dessen Helligkeit. Über das Panel-Symbol steuerst du das zuletzt verwendete Display. Die Schrittweite lässt sich von 1 % bis 25 % einstellen (Standard: 5 %). Schreibvorgänge werden kurz zusammengefasst, damit nicht bei jedem Mausrad-Tick ein Befehl gesendet wird.
- Beim Öffnen des Menüs aktualisiert Lumen die Werte. Nach dem An- oder Abstecken eines Displays kannst du neu suchen lassen. Wähle dazu **Displays aktualisieren** im Menü.
- Lumen läuft als GNOME-Shell-Erweiterung, ohne Hintergrunddienst und ohne Netzwerkverbindungen. Für externe Monitore kann eine einmalige Einrichtung von `ddcutil`, dem Modul `i2c-dev` und den Geräteberechtigungen der aktiven Sitzung erforderlich sein. Helligkeitsänderungen laufen in der angemeldeten Sitzung.

## Installation

### Linux einrichten

Das Einrichtungsskript unterstützt Fedora (`dnf`), Debian/Ubuntu (`apt-get`), Arch Linux (`pacman`) und openSUSE (`zypper`). Es installiert `ddcutil` und `i2c-tools`, aktiviert `i2c-dev` und richtet den Zugriff auf I2C-Geräte in der aktiven Sitzung ein, falls keine ddcutil-udev-Regel vorhanden ist. Prüfe das Skript vor dem Ausführen.

```bash
git clone https://github.com/sailxx/lumen.git
cd lumen
./setup-monitor-brightness.sh
```

Melde dich ab und wieder an, damit die Geräteberechtigungen wirksam werden. Installiere anschließend das Erweiterungsarchiv in einer GNOME-Sitzung:

```bash
sudo dnf install zip glib2-devel   # Fedora, falls Paketerstellungswerkzeuge fehlen
cd extension
./install.sh
```

Starte GNOME Shell neu und aktiviere Lumen:

```bash
gnome-extensions enable lumen@vlad
```

Melde dich unter Wayland ab und wieder an, um GNOME Shell neu zu starten. Unter X11 drückst du `Alt`+`F2`, gibst `r` ein und bestätigst mit Enter.

### Fedora-RPM

```bash
sudo dnf install rpm-build
git clone https://github.com/sailxx/lumen.git
cd lumen/rpm
./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
gnome-extensions enable lumen@vlad
```

Das RPM installiert die Erweiterung und das Schema systemweit, fügt die udev-Regel hinzu und lädt `i2c-dev` beim Systemstart. Starte GNOME Shell nach der Installation neu.

## Voraussetzungen und bekannte Einschränkungen

- Linux mit GNOME Shell 45–50.
- `ddcutil` ab Version 1.4 und `i2c-tools` für externe Monitore.
- Ein DDC/CI-fähiger Monitor, bei dem DDC/CI im Bildschirmmenü aktiviert ist.
- `zip` und `glib-compile-schemas`, um ein lokales Installationsarchiv zu erstellen.
- Für die interne Hintergrundbeleuchtung wird ein Gerät unter `/sys/class/backlight` und eine Freigabe durch logind für die aktuelle Sitzung benötigt.

Einige Dockingstationen und Adapter übertragen DDC/CI nicht zuverlässig. Bei bestimmten NVIDIA-Treiberkonfigurationen kann `nvidia-drm.modeset=1` erforderlich sein. Beachte zum Ändern der Kernel-Argumente die Anweisungen deiner Distribution.

| Problem | Prüfen |
|---|---|
| Ein externer Monitor fehlt | Aktiviere DDC/CI im Monitormenü, führe `ddcutil detect` aus und wähle anschließend **Displays aktualisieren**. |
| `ddcutil` meldet fehlende Berechtigungen | Melde dich nach der Einrichtung ab und wieder an, damit die Berechtigungen der aktiven Sitzung greifen. |
| Der Regler ist nicht verfügbar | Prüfe DDC/CI und führe `ddcutil getvcp 10` aus, um zu sehen, ob der Monitor einen Helligkeitswert meldet. |
| Ein Monitor ist über eine Dockingstation angeschlossen | Stecke ihn erneut an und starte die Suche noch einmal; manche Docks leiten DDC/CI nicht weiter. |

Nützliche Diagnosebefehle:

```bash
ddcutil environment
ddcutil detect
journalctl --user -b _COMM=gnome-shell | grep -i lumen
```

## Verwendung und Deinstallation

Öffne das Sonnensymbol in der oberen GNOME-Leiste und bewege den Regler des gewünschten Displays. Das Mausrad über einer Zeile ändert dieses Display; über dem Panel-Symbol ändert es das zuletzt verwendete. Unter **Einstellungen** kannst du das interne Display ein- oder ausblenden und die Schrittweite ändern.

RPM entfernen:

```bash
sudo dnf remove gnome-shell-extension-lumen
```

Installation aus einem zip-Archiv entfernen:

```bash
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

Falls bei der Einrichtung `/etc/modules-load.d/lumen-i2c-dev.conf` oder `/etc/udev/rules.d/60-monitor-brightness-i2c.rules` erstellt wurden, lösche diese Dateien, um die jeweilige Systemänderung rückgängig zu machen, und lade danach die udev-Regeln neu.

---

**Lumen** · Für jedes Display die passende Helligkeit.  
MIT-Lizenz · GNOME Shell 45–50
