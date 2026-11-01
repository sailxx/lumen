# Lumen

**为 GNOME Shell 中的每台显示器单独调节亮度。** 从顶部栏菜单控制笔记本内置屏幕和支持 DDC/CI 的外接显示器。

[English](README.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [简体中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md)

<kbd>每台显示器独立控制</kbd> <kbd>内置屏幕与 DDC/CI</kbd> <kbd>GNOME 顶部栏菜单</kbd> <kbd>滚轮调节</kbd> <kbd>无需后台服务</kbd> <kbd>运行时无需 root</kbd>

## 功能

- 每台检测到的显示器都有独立的亮度滑块。内置屏幕通过 logind 使用系统背光接口；外接显示器则通过 `ddcutil` 和 DDC/CI 控制。Lumen 会读取显示器报告的亮度；无法读取时会明确显示不可用，而不会猜测数值。
- 在显示器对应的菜单行上滚动即可调节该屏幕。滚动顶部栏图标则调节最近使用的屏幕。步进可设为 1% 至 25%，默认值为 5%。写入操作会短暂合并，避免每滚动一格就发送命令。
- 打开菜单时 Lumen 会刷新数值。连接或断开显示器后，也可以重新扫描；在菜单中选择**刷新显示器**即可。
- Lumen 以 GNOME Shell 扩展的形式运行，不需要后台守护进程，也不会连接网络。外接显示器可能需要一次性配置 `ddcutil`、`i2c-dev` 模块以及当前登录会话的设备权限。调整亮度时会在用户会话中执行。

## 安装

### 配置 Linux

配置脚本支持 Fedora（`dnf`）、Debian/Ubuntu（`apt-get`）、Arch Linux（`pacman`）和 openSUSE（`zypper`）。脚本会安装 `ddcutil` 和 `i2c-tools`、启用 `i2c-dev`，并在系统没有 ddcutil udev 规则时为当前会话配置 I2C 设备访问权限。运行前请先检查脚本内容。

```bash
git clone https://github.com/sailxx/lumen.git
cd lumen
./setup-monitor-brightness.sh
```

请注销并重新登录，使设备权限生效。随后在 GNOME 会话中安装扩展包：

```bash
sudo dnf install zip glib2-devel   # Fedora：缺少打包工具时安装
cd extension
./install.sh
```

重启 GNOME Shell，然后启用 Lumen：

```bash
gnome-extensions enable lumen@vlad
```

Wayland 下请注销并重新登录以重启 GNOME Shell。X11 下按 `Alt`+`F2`，输入 `r` 并按 Enter。

### Fedora RPM

```bash
sudo dnf install rpm-build
git clone https://github.com/sailxx/lumen.git
cd lumen/rpm
./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
gnome-extensions enable lumen@vlad
```

RPM 会在系统范围内安装扩展和设置 schema、添加 udev 规则，并配置系统启动时加载 `i2c-dev`。安装后请重启 GNOME Shell。

## 依赖与已知限制

- 运行 Linux 和 GNOME Shell 45–50。
- 外接显示器需要 `ddcutil` 1.4 或更新版本以及 `i2c-tools`。
- 显示器须支持 DDC/CI，并在屏幕菜单中启用此功能。
- 在本地构建扩展安装包需要 `zip` 和 `glib-compile-schemas`。
- 内置屏幕背光控制需要 `/sys/class/backlight` 下存在设备，并且当前会话获得 logind 授权。

某些扩展坞和转接器无法可靠传递 DDC/CI。某些 NVIDIA 驱动配置可能需要 `nvidia-drm.modeset=1`；修改内核参数时请遵循所用发行版的说明。

| 问题 | 检查方法 |
|---|---|
| 找不到外接显示器 | 在显示器菜单中启用 DDC/CI，运行 `ddcutil detect`，然后选择**刷新显示器**。 |
| `ddcutil` 报权限被拒绝 | 完成配置后注销并重新登录，使当前会话的访问权限生效。 |
| 滑块不可用 | 检查 DDC/CI，并运行 `ddcutil getvcp 10` 查看显示器是否报告亮度。 |
| 显示器通过扩展坞连接 | 重新连接并再次扫描；部分扩展坞无法传递 DDC/CI。 |

诊断命令：

```bash
ddcutil environment
ddcutil detect
journalctl --user -b _COMM=gnome-shell | grep -i lumen
```

## 使用与卸载

点击 GNOME 顶部栏的太阳图标，然后拖动目标显示器的亮度滑块。滚动显示器行可调节该屏幕；滚动顶部栏图标可调节最近使用的屏幕。在**首选项**中可以隐藏内置屏幕并更改滚轮步进。

卸载 RPM：

```bash
sudo dnf remove gnome-shell-extension-lumen
```

卸载 zip 安装的扩展：

```bash
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

如果配置过程创建了 `/etc/modules-load.d/lumen-i2c-dev.conf` 或 `/etc/udev/rules.d/60-monitor-brightness-i2c.rules`，请删除相应文件以撤销系统配置，然后重新加载 udev 规则。

---

**Lumen** · 让每台显示器都拥有合适的亮度。  
MIT 许可证 · GNOME Shell 45–50
