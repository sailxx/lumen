# Lumen

**Réglez la luminosité de chaque écran dans GNOME Shell.** Contrôlez l’écran intégré d’un ordinateur portable et les moniteurs externes DDC/CI depuis le menu du panneau supérieur.

[English](README.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [简体中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md)

<kbd>Réglage indépendant par écran</kbd> <kbd>Écran intégré et DDC/CI</kbd> <kbd>Dans le panneau GNOME</kbd> <kbd>Réglage par défilement</kbd> <kbd>Sans service en arrière-plan</kbd> <kbd>Sans root à l’usage</kbd>

## Fonctionnalités

- Chaque écran détecté possède son propre curseur de luminosité. Lumen utilise l’interface de rétroéclairage du système via logind pour l’écran intégré, et `ddcutil` avec DDC/CI pour les moniteurs externes. La valeur est lue sur l’écran ; si elle est indisponible, Lumen l’indique au lieu d’afficher une estimation.
- Faites défiler la ligne d’un écran pour régler sa luminosité. Le défilement sur l’icône du panneau ajuste le dernier écran utilisé. Le pas se règle de 1 % à 25 % (5 % par défaut). Les écritures sont brièvement regroupées pour éviter une commande à chaque cran de molette.
- Lumen actualise les valeurs à l’ouverture du menu et permet de relancer la détection lorsqu’un écran est connecté ou débranché. Utilisez **Actualiser les écrans** dans le menu.
- Lumen est une extension GNOME Shell, sans service d’arrière-plan ni connexion réseau. Les écrans externes peuvent nécessiter une configuration initiale de `ddcutil`, du module `i2c-dev` et des droits d’accès aux périphériques pour la session active. Les changements de luminosité s’effectuent dans la session utilisateur.

## Installation

### Configuration Linux

Le script de configuration prend en charge Fedora (`dnf`), Debian/Ubuntu (`apt-get`), Arch Linux (`pacman`) et openSUSE (`zypper`). Il installe `ddcutil` et `i2c-tools`, active `i2c-dev` et configure l’accès aux périphériques I2C dans la session active si aucune règle udev ddcutil n’est présente. Examinez le script avant de l’exécuter.

```bash
git clone https://github.com/sailxx/lumen.git
cd lumen
./setup-monitor-brightness.sh
```

Déconnectez-vous puis reconnectez-vous pour appliquer les droits sur les périphériques. Installez ensuite l’archive de l’extension depuis une session GNOME :

```bash
sudo dnf install zip glib2-devel   # Fedora, si les outils de paquetage manquent
cd extension
./install.sh
```

Redémarrez GNOME Shell et activez Lumen :

```bash
gnome-extensions enable lumen@vlad
```

Sous Wayland, déconnectez-vous puis reconnectez-vous pour redémarrer GNOME Shell. Sous X11, appuyez sur `Alt`+`F2`, saisissez `r`, puis appuyez sur Entrée.

### RPM Fedora

```bash
sudo dnf install rpm-build
git clone https://github.com/sailxx/lumen.git
cd lumen/rpm
./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
gnome-extensions enable lumen@vlad
```

Le RPM installe l’extension et son schéma à l’échelle du système, ajoute la règle udev et charge `i2c-dev` au démarrage. Redémarrez GNOME Shell après l’installation.

## Prérequis et limites connues

- Linux avec GNOME Shell 45–50.
- `ddcutil` 1.4 ou ultérieur et `i2c-tools` pour les moniteurs externes.
- Un moniteur compatible DDC/CI, avec cette option activée dans son menu à l’écran.
- `zip` et `glib-compile-schemas` pour créer une archive d’installation locale.
- Le rétroéclairage intégré nécessite un périphérique dans `/sys/class/backlight` et l’autorisation de logind pour la session en cours.

Certains docks et adaptateurs transmettent mal le DDC/CI. Certaines configurations du pilote NVIDIA peuvent nécessiter `nvidia-drm.modeset=1` ; suivez les instructions de votre distribution pour modifier les paramètres du noyau.

| Problème | Vérification |
|---|---|
| Un écran externe est absent | Activez DDC/CI dans le menu du moniteur, lancez `ddcutil detect`, puis choisissez **Actualiser les écrans**. |
| `ddcutil` signale un refus d’accès | Après la configuration, déconnectez-vous puis reconnectez-vous pour appliquer les droits de la session active. |
| Le curseur est indisponible | Vérifiez DDC/CI et lancez `ddcutil getvcp 10` pour voir si le moniteur communique sa luminosité. |
| Le moniteur est raccordé à un dock | Rebranchez-le et relancez la détection ; certains docks ne transmettent pas le DDC/CI. |

Commandes de diagnostic utiles :

```bash
ddcutil environment
ddcutil detect
journalctl --user -b _COMM=gnome-shell | grep -i lumen
```

## Utilisation et désinstallation

Ouvrez l’icône soleil dans le panneau supérieur de GNOME et déplacez le curseur de l’écran souhaité. La molette sur une ligne règle cet écran ; sur l’icône du panneau, elle règle le dernier écran utilisé. Dans **Préférences**, vous pouvez masquer l’écran intégré et modifier le pas de défilement.

Pour une installation RPM :

```bash
sudo dnf remove gnome-shell-extension-lumen
```

Pour une installation depuis une archive zip :

```bash
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

Si la configuration a créé `/etc/modules-load.d/lumen-i2c-dev.conf` ou `/etc/udev/rules.d/60-monitor-brightness-i2c.rules`, supprimez ces fichiers pour annuler les changements système concernés, puis rechargez les règles udev.

---

**Lumen** · La luminosité idéale pour chaque écran.  
Licence MIT · GNOME Shell 45–50
