# Lumen

**Control de brillo por pantalla para GNOME Shell.** Ajusta la pantalla integrada del portátil y los monitores externos DDC/CI desde el menú del panel superior.

[English](README.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [简体中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md)

<kbd>Control independiente por pantalla</kbd> <kbd>Pantalla integrada y DDC/CI</kbd> <kbd>Panel nativo de GNOME</kbd> <kbd>Ajuste con la rueda</kbd> <kbd>Sin servicio en segundo plano</kbd> <kbd>Sin root durante el uso</kbd>

## Funciones

- Cada pantalla detectada tiene su propio control de brillo. Lumen usa la interfaz del sistema a través de logind para la pantalla integrada y `ddcutil` con DDC/CI para los monitores externos. Lee el brillo de la pantalla y lo muestra como no disponible si no se puede consultar.
- Desplázate sobre la fila de una pantalla para ajustar su brillo. Desplázate sobre el icono del panel para controlar la última pantalla usada. El paso se configura entre 1 % y 25 % (5 % de forma predeterminada). Las escrituras se agrupan brevemente para evitar enviar un comando por cada movimiento de la rueda.
- Lumen actualiza los valores al abrir el menú y permite volver a detectar las pantallas al conectar o desconectar una. Usa **Actualizar pantallas** en el menú para iniciar un nuevo análisis.
- Lumen funciona como una extensión de GNOME Shell, sin servicio en segundo plano ni conexiones de red. Los monitores externos pueden requerir una configuración inicial de `ddcutil`, el módulo `i2c-dev` y permisos para los dispositivos en la sesión activa. Los cambios de brillo se realizan en la sesión del usuario.

## Instalación

### Configuración de Linux

El script de configuración es compatible con Fedora (`dnf`), Debian/Ubuntu (`apt-get`), Arch Linux (`pacman`) y openSUSE (`zypper`). Instala `ddcutil` e `i2c-tools`, activa `i2c-dev` y, si el sistema no tiene una regla udev de ddcutil, configura el acceso a los dispositivos I2C durante la sesión activa. Revisa el script antes de ejecutarlo.

```bash
git clone https://github.com/sailxx/lumen.git
cd lumen
./setup-monitor-brightness.sh
```

Cierra la sesión y vuelve a iniciarla para aplicar los permisos de los dispositivos. Después, instala el archivo de la extensión desde una sesión de GNOME:

```bash
sudo dnf install zip glib2-devel   # Fedora, si faltan herramientas de empaquetado
cd extension
./install.sh
```

Reinicia GNOME Shell y activa Lumen:

```bash
gnome-extensions enable lumen@vlad
```

En Wayland, cierra y vuelve a iniciar sesión para reiniciar GNOME Shell. En X11, pulsa `Alt`+`F2`, escribe `r` y pulsa Enter.

### RPM para Fedora

```bash
sudo dnf install rpm-build
git clone https://github.com/sailxx/lumen.git
cd lumen/rpm
./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
gnome-extensions enable lumen@vlad
```

El RPM instala la extensión y su esquema en todo el sistema, añade la regla udev y carga `i2c-dev` al iniciar. Reinicia GNOME Shell después de la instalación.

## Requisitos y limitaciones conocidas

- Linux con GNOME Shell 45–50.
- `ddcutil` 1.4 o posterior e `i2c-tools` para monitores externos.
- Un monitor compatible con DDC/CI, con esta opción activada en su menú en pantalla.
- `zip` y `glib-compile-schemas` para crear un archivo local de instalación.
- El control de la pantalla integrada requiere un dispositivo en `/sys/class/backlight` y permisos de logind para la sesión actual.

Algunas bases y adaptadores no transmiten DDC/CI de forma fiable. Ciertas configuraciones del controlador NVIDIA pueden requerir `nvidia-drm.modeset=1`; consulta las instrucciones de tu distribución para modificar los parámetros del kernel.

| Problema | Qué comprobar |
|---|---|
| No aparece un monitor externo | Activa DDC/CI en el menú del monitor, ejecuta `ddcutil detect` y selecciona **Actualizar pantallas**. |
| `ddcutil` indica que no hay permisos | Cierra y vuelve a iniciar sesión después de la configuración para aplicar los permisos de la sesión activa. |
| El control no está disponible | Comprueba DDC/CI y ejecuta `ddcutil getvcp 10` para ver si el monitor informa del brillo. |
| El monitor está conectado a una base | Vuelve a conectarlo y escanea otra vez; algunas bases no transmiten DDC/CI. |

Comandos útiles para el diagnóstico:

```bash
ddcutil environment
ddcutil detect
journalctl --user -b _COMM=gnome-shell | grep -i lumen
```

## Uso y desinstalación

Abre el icono del sol en el panel superior de GNOME y mueve el control de la pantalla deseada. La rueda sobre una fila ajusta esa pantalla; sobre el icono del panel ajusta la última pantalla usada. En **Preferencias** puedes mostrar u ocultar la pantalla integrada y cambiar el paso de desplazamiento.

Para una instalación RPM:

```bash
sudo dnf remove gnome-shell-extension-lumen
```

Para una instalación desde un archivo zip:

```bash
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

Si la configuración creó `/etc/modules-load.d/lumen-i2c-dev.conf` o `/etc/udev/rules.d/60-monitor-brightness-i2c.rules`, elimina esos archivos para deshacer los cambios correspondientes y vuelve a cargar las reglas de udev.

---

**Lumen** · El brillo adecuado para cada pantalla.  
Licencia MIT · GNOME Shell 45–50
