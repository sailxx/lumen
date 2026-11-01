# RPM spec for the GNOME Shell extension Lumen.
# Build it from the repository's rpm/ directory with ./build-rpm.sh.

Name:           gnome-shell-extension-lumen
Version:        2
Release:        1%{?dist}
Summary:        Lumen - per-monitor brightness sliders for GNOME Shell (DDC/CI)

License:        MIT
BuildArch:      noarch

Source0:        %{name}-%{version}.tar.gz

Requires:       gnome-shell >= 45
Requires:       ddcutil >= 1.4

%description
Lumen is a GNOME Shell extension with a panel indicator and a brightness
slider for each controllable display. The built-in laptop panel is managed
through logind; external displays are controlled over DDC/CI with ddcutil.

The package also ships:
 * the GSettings schema, installed system-wide;
 * a udev rule granting the active session access to /dev/i2c-* (uaccess),
   so DDC/CI works without root and without the i2c group;
 * a modules-load config that loads the i2c-dev kernel module at boot.

The user interface is in English.

%prep
%setup -q

%build
# No compilation is needed; the extension is written in JavaScript.

%install
rm -rf %{buildroot}

# Install the extension in GNOME Shell's system-wide extensions directory.
# Install the settings schema system-wide, not inside the extension directory.
install -dm 0755 %{buildroot}%{_datadir}/gnome-shell/extensions/lumen@vlad
install -m 0644 -t %{buildroot}%{_datadir}/gnome-shell/extensions/lumen@vlad \
    extension/metadata.json extension/extension.js extension/ddcutil.js \
    extension/backlight.js extension/prefs.js extension/stylesheet.css

# Recompile the GSettings schema after installation and removal.
install -Dm 0644 extension/schemas/org.gnome.shell.extensions.monitor-brightness.gschema.xml \
    %{buildroot}%{_datadir}/glib-2.0/schemas/org.gnome.shell.extensions.monitor-brightness.gschema.xml

# Grant the active session access to I2C devices for DDC/CI control.
install -Dm 0644 60-monitor-brightness-i2c.rules \
    %{buildroot}/usr/lib/udev/rules.d/60-monitor-brightness-i2c.rules

# Load the i2c-dev kernel module at boot.
install -Dm 0644 i2c-dev.conf \
    %{buildroot}/usr/lib/modules-load.d/lumen-i2c-dev.conf

%files
%license LICENSE
%dir %{_datadir}/gnome-shell/extensions/lumen@vlad
%{_datadir}/gnome-shell/extensions/lumen@vlad/metadata.json
%{_datadir}/gnome-shell/extensions/lumen@vlad/extension.js
%{_datadir}/gnome-shell/extensions/lumen@vlad/ddcutil.js
%{_datadir}/gnome-shell/extensions/lumen@vlad/backlight.js
%{_datadir}/gnome-shell/extensions/lumen@vlad/prefs.js
%{_datadir}/gnome-shell/extensions/lumen@vlad/stylesheet.css
%{_datadir}/glib-2.0/schemas/org.gnome.shell.extensions.monitor-brightness.gschema.xml
/usr/lib/udev/rules.d/60-monitor-brightness-i2c.rules
/usr/lib/modules-load.d/lumen-i2c-dev.conf

%post
glib-compile-schemas %{_datadir}/glib-2.0/schemas/ &>/dev/null || :

%postun
glib-compile-schemas %{_datadir}/glib-2.0/schemas/ &>/dev/null || :

%changelog
* Sun Nov 01 2026 Vlad <vlad@localhost> - 2-1
- Improve error handling, display refresh behavior, and package consistency.
