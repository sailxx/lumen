# Lumen

**GNOME Shell でディスプレイごとに明るさを調整。** ノート PC の内蔵画面や DDC/CI 対応の外部モニターを、トップパネルのメニューから操作できます。

[English](README.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [简体中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md)

<kbd>画面ごとに個別調整</kbd> <kbd>内蔵画面と DDC/CI</kbd> <kbd>GNOME パネルから操作</kbd> <kbd>スクロールで調整</kbd> <kbd>常駐サービス不要</kbd> <kbd>利用時に root 不要</kbd>

## 機能

- 検出した画面ごとに明るさスライダーを表示します。内蔵画面には logind 経由のシステムバックライト機能を、外部モニターには `ddcutil` と DDC/CI を使用します。明るさは画面から読み取り、取得できない場合は推測せずに利用不可と表示します。
- ディスプレイの行をスクロールすると、その画面の明るさを調整できます。パネルアイコン上のスクロールでは最後に使った画面を調整します。ステップ幅は 1%〜25% で設定でき、初期値は 5% です。ホイール操作ごとにコマンドを送らないよう、書き込みを短時間まとめます。
- メニューを開くと明るさを更新します。画面の接続・切断後には再スキャンでき、メニューの **ディスプレイを更新** から手動で実行できます。
- Lumen は GNOME Shell 拡張機能として動作し、バックグラウンドサービスやネットワーク接続はありません。外部モニターでは `ddcutil`、`i2c-dev` モジュール、アクティブセッションのデバイス権限を一度設定する必要がある場合があります。明るさの変更はログイン中のセッションで行います。

## インストール

### Linux のセットアップ

セットアップスクリプトは Fedora（`dnf`）、Debian/Ubuntu（`apt-get`）、Arch Linux（`pacman`）、openSUSE（`zypper`）に対応しています。`ddcutil` と `i2c-tools` をインストールし、`i2c-dev` を有効にします。ddcutil の udev ルールがない場合は、アクティブセッションから I2C デバイスへアクセスできるよう設定します。実行前にスクリプトを確認してください。

```bash
git clone https://github.com/sailxx/lumen.git
cd lumen
./setup-monitor-brightness.sh
```

デバイス権限を反映するため、一度ログアウトして再ログインしてください。その後 GNOME セッションから拡張機能をインストールします。

```bash
sudo dnf install zip glib2-devel   # Fedora：パッケージ作成ツールがない場合
cd extension
./install.sh
```

GNOME Shell を再起動し、Lumen を有効にします。

```bash
gnome-extensions enable lumen@vlad
```

Wayland ではログアウトして再ログインすると GNOME Shell が再起動します。X11 では `Alt`+`F2` を押し、`r` を入力して Enter を押します。

### Fedora RPM

```bash
sudo dnf install rpm-build
git clone https://github.com/sailxx/lumen.git
cd lumen/rpm
./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
gnome-extensions enable lumen@vlad
```

RPM は拡張機能と設定スキーマをシステム全体にインストールし、udev ルールを追加し、起動時に `i2c-dev` を読み込みます。インストール後に GNOME Shell を再起動してください。

## 必要条件と既知の制限

- GNOME Shell 45〜50 を搭載した Linux。
- 外部モニター用の `ddcutil` 1.4 以降と `i2c-tools`。
- DDC/CI に対応し、モニターのオンスクリーンメニューで DDC/CI が有効になっていること。
- ローカルのインストールアーカイブを作成するには `zip` と `glib-compile-schemas` が必要です。
- 内蔵バックライト制御には `/sys/class/backlight` 内のデバイスと、現在のセッションに対する logind の許可が必要です。

一部のドックやアダプターは DDC/CI を安定して中継できません。NVIDIA ドライバーの構成によっては `nvidia-drm.modeset=1` が必要な場合があります。カーネル引数の変更方法は各ディストリビューションの手順を確認してください。

| 症状 | 確認内容 |
|---|---|
| 外部モニターが見つからない | モニターのメニューで DDC/CI を有効にし、`ddcutil detect` を実行してから **ディスプレイを更新** を選択します。 |
| `ddcutil` が権限エラーを返す | セットアップ後にログアウトして再ログインし、アクティブセッションの権限を反映します。 |
| スライダーを操作できない | DDC/CI を確認し、`ddcutil getvcp 10` でモニターが明るさを報告するか確認します。 |
| ドック経由で接続している | 接続し直して再スキャンします。一部のドックは DDC/CI を中継できません。 |

診断に使えるコマンド：

```bash
ddcutil environment
ddcutil detect
journalctl --user -b _COMM=gnome-shell | grep -i lumen
```

## 使い方とアンインストール

GNOME トップパネルの太陽アイコンを開き、対象画面のスライダーを動かします。各画面の行をスクロールするとその画面を、パネルアイコンをスクロールすると最後に使った画面を調整できます。**設定** では内蔵画面の表示切り替えやスクロール幅を変更できます。

RPM の削除：

```bash
sudo dnf remove gnome-shell-extension-lumen
```

zip からインストールした拡張機能の削除：

```bash
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

セットアップで `/etc/modules-load.d/lumen-i2c-dev.conf` または `/etc/udev/rules.d/60-monitor-brightness-i2c.rules` が作成されている場合、該当するシステム設定を元に戻すにはファイルを削除して udev ルールを再読み込みしてください。

---

**Lumen** · 画面ごとに、ちょうどよい明るさ。  
MIT ライセンス · GNOME Shell 45〜50
