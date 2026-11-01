# Lumen

**Controle o brilho de cada tela no GNOME Shell.** Ajuste a tela interna do notebook e monitores externos DDC/CI pelo menu do painel superior.

[English](README.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [简体中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md)

<kbd>Controle independente por tela</kbd> <kbd>Tela interna e DDC/CI</kbd> <kbd>No painel do GNOME</kbd> <kbd>Ajuste pela rolagem</kbd> <kbd>Sem serviço em segundo plano</kbd> <kbd>Sem root durante o uso</kbd>

## Recursos

- Cada tela detectada tem seu próprio controle de brilho. O Lumen usa a interface de luz de fundo do sistema via logind para a tela interna e `ddcutil` com DDC/CI para monitores externos. O brilho é lido da própria tela; se não estiver disponível, o Lumen informa isso em vez de estimar um valor.
- Role sobre a linha de uma tela para ajustar seu brilho. Role sobre o ícone do painel para controlar a última tela usada. O intervalo do passo é configurável entre 1% e 25% (5% por padrão). As gravações são agrupadas brevemente para evitar um comando a cada movimento da roda.
- O Lumen atualiza os valores quando o menu é aberto e pode buscar as telas novamente quando uma é conectada ou desconectada. Use **Atualizar telas** no menu para fazer uma nova busca.
- O Lumen funciona como uma extensão do GNOME Shell, sem serviço em segundo plano e sem conexões de rede. Monitores externos podem precisar de uma configuração inicial do `ddcutil`, do módulo `i2c-dev` e das permissões de dispositivo da sessão ativa. Os ajustes de brilho são executados na sessão do usuário.

## Instalação

### Configuração do Linux

O script de configuração oferece suporte ao Fedora (`dnf`), Debian/Ubuntu (`apt-get`), Arch Linux (`pacman`) e openSUSE (`zypper`). Ele instala `ddcutil` e `i2c-tools`, ativa o `i2c-dev` e configura o acesso aos dispositivos I2C na sessão ativa caso o sistema não tenha uma regra udev do ddcutil. Revise o script antes de executá-lo.

```bash
git clone https://github.com/sailxx/lumen.git
cd lumen
./setup-monitor-brightness.sh
```

Saia da sessão e entre novamente para aplicar as permissões dos dispositivos. Depois, instale o pacote da extensão em uma sessão do GNOME:

```bash
sudo dnf install zip glib2-devel   # Fedora, caso faltem ferramentas de empacotamento
cd extension
./install.sh
```

Reinicie o GNOME Shell e ative o Lumen:

```bash
gnome-extensions enable lumen@vlad
```

No Wayland, saia e entre novamente para reiniciar o GNOME Shell. No X11, pressione `Alt`+`F2`, digite `r` e pressione Enter.

### RPM do Fedora

```bash
sudo dnf install rpm-build
git clone https://github.com/sailxx/lumen.git
cd lumen/rpm
./build-rpm.sh
sudo dnf install rpmbuild/RPMS/noarch/gnome-shell-extension-lumen-*.rpm
gnome-extensions enable lumen@vlad
```

O RPM instala a extensão e o esquema no sistema, adiciona a regra udev e carrega o `i2c-dev` na inicialização. Reinicie o GNOME Shell após a instalação.

## Requisitos e limitações conhecidas

- Linux com GNOME Shell 45–50.
- `ddcutil` 1.4 ou posterior e `i2c-tools` para monitores externos.
- Monitor compatível com DDC/CI, com DDC/CI ativado no menu exibido na tela.
- `zip` e `glib-compile-schemas` para montar um pacote local de instalação.
- O controle da luz de fundo interna requer um dispositivo em `/sys/class/backlight` e a permissão do logind para a sessão atual.

Alguns docks e adaptadores não transmitem DDC/CI de forma confiável. Certas configurações do driver NVIDIA podem exigir `nvidia-drm.modeset=1`; siga as instruções da sua distribuição para alterar os parâmetros do kernel.

| Problema | O que verificar |
|---|---|
| Um monitor externo não aparece | Ative o DDC/CI no menu do monitor, execute `ddcutil detect` e selecione **Atualizar telas**. |
| `ddcutil` informa falta de permissão | Saia da sessão e entre novamente após a configuração para aplicar as permissões da sessão ativa. |
| O controle está indisponível | Verifique o DDC/CI e execute `ddcutil getvcp 10` para conferir se o monitor informa o brilho. |
| O monitor está conectado por um dock | Reconecte-o e faça uma nova busca; alguns docks não transmitem DDC/CI. |

Comandos úteis para diagnóstico:

```bash
ddcutil environment
ddcutil detect
journalctl --user -b _COMM=gnome-shell | grep -i lumen
```

## Uso e desinstalação

Abra o ícone de sol no painel superior do GNOME e mova o controle da tela desejada. A roda sobre uma linha ajusta aquela tela; sobre o ícone do painel, ajusta a última tela usada. Em **Preferências**, você pode ocultar a tela interna e alterar o passo de rolagem.

Para uma instalação por RPM:

```bash
sudo dnf remove gnome-shell-extension-lumen
```

Para uma instalação por arquivo zip:

```bash
gnome-extensions disable lumen@vlad
rm -rf ~/.local/share/gnome-shell/extensions/lumen@vlad
```

Se a configuração criou `/etc/modules-load.d/lumen-i2c-dev.conf` ou `/etc/udev/rules.d/60-monitor-brightness-i2c.rules`, remova esses arquivos para desfazer as alterações correspondentes e recarregue as regras do udev.

---

**Lumen** · O brilho certo para cada tela.  
Licença MIT · GNOME Shell 45–50
