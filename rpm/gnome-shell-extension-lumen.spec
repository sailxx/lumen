# SPEC-пакет расширения GNOME Shell «Lumen — Monitor Brightness».
# Сборка (из папки rpm/):  ./build-rpm.sh
# Скрипт сам собирает tarball из ../extension и вызывает rpmbuild.

Name:           gnome-shell-extension-lumen
Version:        1
Release:        1%{?dist}
Summary:        Lumen - per-monitor brightness sliders for GNOME Shell (DDC/CI)

License:        MIT
BuildArch:      noarch

Source0:        %{name}-%{version}.tar.gz

Requires:       gnome-shell >= 45
Requires:       ddcutil >= 1.4

%description
Lumen is a GNOME Shell extension written from scratch: a panel indicator
with a brightness slider for every monitor - the internal laptop panel
(managed via logind, no root needed) and external displays over DDC/CI
(via ddcutil).

The package also ships:
 * the GSettings schema, installed system-wide;
 * a udev rule granting the active session access to /dev/i2c-* (uaccess),
   so DDC/CI works without root and without the i2c group;
 * a modules-load config that loads the i2c-dev kernel module at boot.

UI language: Russian.

%prep
%setup -q

%build
# Нечего собирать: чистый JavaScript.

%install
rm -rf %{buildroot}

# Само расширение — в системную папку GNOME Shell.
# ВАЖНО: каталог schemas/ внутрь расширения НЕ ставим. Схема ставится
# системно, а getSettings() сам найдёт её через источник по умолчанию.
install -dm 0755 %{buildroot}%{_datadir}/gnome-shell/extensions/lumen@vlad
install -m 0644 -t %{buildroot}%{_datadir}/gnome-shell/extensions/lumen@vlad \
    metadata.json extension.js prefs.js stylesheet.css

# GSettings-схема — системно (перекомпиляцию делают %post и filetrigger glib2).
install -Dm 0644 schemas/org.gnome.shell.extensions.monitor-brightness.gschema.xml \
    %{buildroot}%{_datadir}/glib-2.0/schemas/org.gnome.shell.extensions.monitor-brightness.gschema.xml

# Доступ к /dev/i2c-* для активного сеанса (DDC/CI без root и без группы i2c).
install -Dm 0644 60-monitor-brightness-i2c.rules \
    %{buildroot}/usr/lib/udev/rules.d/60-monitor-brightness-i2c.rules

# Модуль ядра i2c-dev — грузить при старте системы.
install -Dm 0644 i2c-dev.conf \
    %{buildroot}/usr/lib/modules-load.d/lumen-i2c-dev.conf

%files
%license LICENSE
%dir %{_datadir}/gnome-shell/extensions/lumen@vlad
%{_datadir}/gnome-shell/extensions/lumen@vlad/metadata.json
%{_datadir}/gnome-shell/extensions/lumen@vlad/extension.js
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
* Sat Oct 31 2026 Vlad <vlad@localhost> - 1-1
- Initial package: Lumen - panel indicator with per-monitor brightness
  sliders (DDC/CI via ddcutil + internal panel via logind).
