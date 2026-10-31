'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const VCP_BRIGHTNESS = 10;      // VCP-код яркости в DDC/CI
const SET_DEBOUNCE_MS = 150;    // пауза после движения слайдера до записи в монитор

/* ---------------- вспомогательное ---------------- */

function execAsync(argv, cancellable) {
    return new Promise((resolve, reject) => {
        let proc;
        try {
            proc = Gio.Subprocess.new(
                argv,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
        } catch (err) {
            reject(err);
            return;
        }
        proc.communicate_utf8_async(null, cancellable, (p, res) => {
            try {
                const [, stdout] = p.communicate_utf8_finish(res);
                resolve(stdout ?? '');
            } catch (err) {
                reject(err);
            }
        });
    });
}

function isCancelled(err) {
    return err && typeof err.matches === 'function' &&
        err.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED);
}

function readInt(path) {
    try {
        const [ok, bytes] = GLib.file_get_contents(path);
        if (!ok)
            return -1;
        return parseInt(new TextDecoder().decode(bytes).trim(), 10);
    } catch {
        return -1;
    }
}

/* Разбор «ddcutil detect» (поддерживает и старый, и новый формат вывода) */
function parseDdcDetect(text) {
    const monitors = [];
    let cur = null;
    let mfg = null;
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        let m;
        if ((m = line.match(/^Display (\d+)/))) {
            if (cur)
                monitors.push(cur);
            cur = {display: parseInt(m[1], 10), bus: null, connector: null, name: null};
            mfg = null;
        } else if (cur) {
            if ((m = line.match(/^I2C bus:\s+\/dev\/i2c-(\d+)/))) {
                cur.bus = parseInt(m[1], 10);
            } else if ((m = line.match(/^DRM connector:\s+card\d+-([A-Za-z0-9-]+)/))) {
                cur.connector = m[1];
            } else if ((m = line.match(/^Monitor:\s+(.+)$/))) {
                cur.name = m[1];
            } else if ((m = line.match(/^Mfg id:\s+(.+)$/))) {
                mfg = m[1].trim();
            } else if ((m = line.match(/^Model:\s+(.+)$/))) {
                cur.name = `${mfg ?? ''} ${m[1].trim()}`.trim();
            }
        }
    }
    if (cur)
        monitors.push(cur);

    for (const mon of monitors) {
        if (mon.name) {
            // у ddcutil 2.x строка вида «_DEL DEL DELL U2415 …» — приберём её
            const words = [...new Set(mon.name.trim().split(/\s+/))];
            mon.name = words.join(' ');
            if (mon.name.length > 24)
                mon.name = `${mon.name.slice(0, 23)}…`;
        }
    }
    return monitors;
}

/* Разбор «ddcutil getvcp 10»: current value = 50, max value = 100 */
function parseGetvcp(text) {
    const m = text.match(/current value\s*=\s*(\d+)\s*,\s*max value\s*=\s*(\d+)/);
    if (!m)
        return null;
    const max = parseInt(m[2], 10);
    if (max <= 0)
        return null;
    return {current: parseInt(m[1], 10), max, frac: parseInt(m[1], 10) / max};
}

/* Встроенная подсветка ноутбука (поддержка через logind, без root) */
function findInternalBacklight() {
    try {
        const dir = Gio.File.new_for_path('/sys/class/backlight');
        const children = dir.enumerate_children(
            'standard::name', Gio.FileQueryInfoFlags.NONE, null);
        const names = [];
        let info;
        while ((info = children.next_file(null)) !== null)
            names.push(info.get_name());
        children.close(null);
        if (names.length === 0)
            return null;

        const score = n => {
            if (/^(intel_backlight|amdgpu_bl|nv_backlight|radeon_bl|apple_panel_bl)/.test(n))
                return 3;
            if (/^acpi_video/.test(n))
                return 1;
            return 2;
        };
        names.sort((a, b) => score(b) - score(a));

        const name = names[0];
        const max = readInt(`/sys/class/backlight/${name}/max_brightness`);
        if (max <= 0)
            return null;
        return {name, max};
    } catch {
        return null;
    }
}

function setLogindBrightness(backlightName, value) {
    Gio.DBus.system.call(
        'org.freedesktop.login1',
        '/org/freedesktop/login1/session/auto',
        'org.freedesktop.login1.Session',
        'SetBrightness',
        new GLib.Variant('(ssu)', ['backlight', backlightName, value]),
        null, Gio.DBusCallFlags.NONE, -1, null,
        (conn, res) => {
            try {
                conn.call_finish(res);
            } catch (err) {
                console.error(`monitor-brightness: ${err.message}`);
            }
        });
}

/* ---------------- строка меню: имя + слайдер + % ---------------- */

const BrightnessRow = GObject.registerClass({
    Signals: {'changed': {param_types: [GObject.TYPE_DOUBLE]}},
}, class BrightnessRow extends PopupMenu.PopupBaseMenuItem {
    _init(desc) {
        super._init({activate: false});

        this.desc = desc;          // {id, label, kind: 'internal'|'ddc', bus, display}
        this.stepPercent = 5;
        this.dragging = false;
        this._updating = false;

        const name = new St.Label({
            text: desc.label,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
        });
        name.add_style_class_name('mb-name');
        this.add_child(name);

        this._slider = new Slider.Slider(0.5);
        this._slider.x_expand = true;
        this._slider.y_align = Clutter.ActorAlign.CENTER;
        this._slider.connect('drag-begin', () => (this.dragging = true));
        this._slider.connect('drag-end', () => (this.dragging = false));
        this._slider.connect('notify::value', () => {
            if (this._updating)
                return;
            this._valueLabel.text = `${Math.round(this._slider.value * 100)}`;
            this.emit('changed', this._slider.value);
        });
        this.add_child(this._slider);

        this._valueLabel = new St.Label({
            text: '…',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._valueLabel.add_style_class_name('mb-value');
        this.add_child(this._valueLabel);

        this.connect('scroll-event', (actor, event) => {
            const dir = event.get_scroll_direction();
            if (dir === Clutter.ScrollDirection.UP)
                this._nudge(this.stepPercent);
            else if (dir === Clutter.ScrollDirection.DOWN)
                this._nudge(-this.stepPercent);
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _nudge(percent) {
        const v = this._slider.value + percent / 100;
        this._slider.value = Math.min(1, Math.max(0, v));
    }

    setOnline(frac) {
        this._updating = true;
        this._slider.value = frac;
        this._updating = false;
        this._valueLabel.text = `${Math.round(frac * 100)}`;
    }

    setUnavailable() {
        this.sensitive = false;
        this._valueLabel.text = '—';
    }

    get value() {
        return this._slider.value;
    }

    set value(v) {
        this._slider.value = Math.min(1, Math.max(0, v));
    }
});

/* ---------------- индикатор на панели ---------------- */

const MonitorBrightnessIndicator = GObject.registerClass(
class MonitorBrightnessIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, extension.metadata.name, true);

        this._extension = extension;
        this._settings = extension.getSettings();
        this._cancellable = new Gio.Cancellable();
        this._rows = [];
        this._timeouts = new Map();
        this._internal = null;
        this._lastRow = null;
        this._placeholder = null;

        this.add_child(new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon',
        }));
        this.setMenu(new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP, 0));

        this._section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._section);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const rescanItem = new PopupMenu.PopupMenuItem('Обновить мониторы');
        rescanItem.connect('activate', () => this.rebuild());
        this.menu.addMenuItem(rescanItem);

        const prefsItem = new PopupMenu.PopupMenuItem('Настройки');
        prefsItem.connect('activate', () => this._extension.openPrefs());
        this.menu.addMenuItem(prefsItem);

        this._openId = this.menu.connect('open-state-changed', (menu, open) => {
            if (open)
                this.refreshValues();
        });
        this._scrollId = this.connect('scroll-event', (actor, event) => {
            this._onPanelScroll(event);
            return Clutter.EVENT_PROPAGATE;
        });
        this._internalId = this._settings.connect('changed::show-internal',
            () => this.rebuild());
        this._stepId = this._settings.connect('changed::scroll-step', () => {
            const step = this._settings.get_int('scroll-step');
            this._rows.forEach(r => (r.stepPercent = step));
        });

        this.rebuild();
    }

    rebuild() {
        this._clearRows();

        this._placeholder = new PopupMenu.PopupMenuItem('Определение мониторов…');
        this._placeholder.sensitive = false;
        this._section.addMenuItem(this._placeholder);

        const cancellable = this._cancellable;
        execAsync(['ddcutil', 'detect'], cancellable).then(text => {
            if (cancellable.is_cancelled())
                return;
            this._dropPlaceholder();

            const showInternal = this._settings.get_boolean('show-internal');

            // встроенный экран — через подсветку sysfs + logind
            this._internal = showInternal ? findInternalBacklight() : null;
            if (this._internal)
                this._addRow({id: 'internal', label: 'Встроенный экран', kind: 'internal'});

            // внешние мониторы — через DDC/CI
            const monitors = parseDdcDetect(text);
            for (const mon of monitors) {
                // встроенную панель ddcutil тоже видит как eDP — не дублируем
                if (showInternal && this._internal &&
                    mon.connector && /^(eDP|LVDS)/.test(mon.connector))
                    continue;

                const label = mon.connector && mon.name
                    ? `${mon.connector} · ${mon.name}`
                    : (mon.name ?? `Монитор ${mon.display}`);
                this._addRow({
                    id: `ddc-${mon.display}`,
                    label,
                    kind: 'ddc',
                    bus: mon.bus,
                    display: mon.display,
                });
            }

            if (this._rows.length === 0) {
                const empty = new PopupMenu.PopupMenuItem('Мониторы DDC/CI не найдены');
                empty.sensitive = false;
                this._section.addMenuItem(empty);
            }

            this.refreshValues();
        }).catch(err => {
            if (isCancelled(err))
                return;
            this._dropPlaceholder();
            const item = new PopupMenu.PopupMenuItem(
                'Не удалось обратиться к ddcutil — попробуй «Обновить мониторы»');
            item.sensitive = false;
            this._section.addMenuItem(item);
            console.error(`monitor-brightness: ${err.message}`);
        });
    }

    _addRow(desc) {
        const row = new BrightnessRow(desc);
        row.stepPercent = this._settings.get_int('scroll-step');
        row.connect('changed', (r, frac) => this._onRowChanged(r, frac));
        this._section.addMenuItem(row);
        this._rows.push(row);
        return row;
    }

    _onRowChanged(row, frac) {
        this._lastRow = row;

        if (row.desc.kind === 'internal') {
            const bl = this._internal;
            if (bl)
                setLogindBrightness(bl.name, Math.round(frac * bl.max));
            return;
        }

        const pct = Math.min(100, Math.max(0, Math.round(frac * 100)));
        this._scheduleSet(row, pct);
    }

    _scheduleSet(row, pct) {
        const {bus, display} = row.desc;
        if (this._timeouts.has(row.desc.id))
            GLib.source_remove(this._timeouts.get(row.desc.id));

        this._timeouts.set(row.desc.id, GLib.timeout_add(
            GLib.PRIORITY_DEFAULT, SET_DEBOUNCE_MS, () => {
                this._timeouts.delete(row.desc.id);
                const argv = bus !== null
                    ? ['ddcutil', 'setvcp', String(VCP_BRIGHTNESS), String(pct),
                        '--bus', String(bus)]
                    : ['ddcutil', 'setvcp', String(VCP_BRIGHTNESS), String(pct),
                        '--display', String(display)];
                execAsync(argv, this._cancellable).catch(err => {
                    if (!isCancelled(err))
                        console.error(`monitor-brightness: ${err.message}`);
                });
                return GLib.SOURCE_REMOVE;
            }));
    }

    refreshValues() {
        for (const row of this._rows) {
            if (row.dragging)
                continue;

            if (row.desc.kind === 'internal') {
                const bl = this._internal;
                if (!bl)
                    continue;
                const v = readInt(`/sys/class/backlight/${bl.name}/brightness`);
                if (v >= 0)
                    row.setOnline(v / bl.max);
                continue;
            }

            const {bus, display} = row.desc;
            const argv = bus !== null
                ? ['ddcutil', 'getvcp', String(VCP_BRIGHTNESS), '--bus', String(bus)]
                : ['ddcutil', 'getvcp', String(VCP_BRIGHTNESS), '--display', String(display)];
            execAsync(argv, this._cancellable).then(text => {
                if (this._cancellable.is_cancelled() || row.dragging)
                    return;
                const parsed = parseGetvcp(text);
                if (parsed)
                    row.setOnline(parsed.frac);
                else
                    row.setUnavailable();
            }).catch(err => {
                if (!isCancelled(err))
                    console.debug(`monitor-brightness: getvcp: ${err.message}`);
            });
        }
    }

    _onPanelScroll(event) {
        const row = this._lastRow ?? this._rows[0];
        if (!row)
            return;
        const dir = event.get_scroll_direction();
        if (dir === Clutter.ScrollDirection.UP)
            row.value += row.stepPercent / 100;
        else if (dir === Clutter.ScrollDirection.DOWN)
            row.value -= row.stepPercent / 100;
    }

    _dropPlaceholder() {
        if (this._placeholder) {
            this._placeholder.destroy();
            this._placeholder = null;
        }
    }

    _clearRows() {
        for (const id of this._timeouts.keys())
            GLib.source_remove(this._timeouts.get(id));
        this._timeouts.clear();
        this._section.removeAll();
        this._dropPlaceholder();
        this._rows = [];
        this._lastRow = null;
    }

    shutdown() {
        this._cancellable.cancel();
        this._clearRows();
        this._settings.disconnect(this._internalId);
        this._settings.disconnect(this._stepId);
        this.menu.disconnect(this._openId);
        this.disconnect(this._scrollId);
    }
});

/* ---------------- точка входа расширения ---------------- */

export default class MonitorBrightnessExtension extends Extension {
    enable() {
        this._indicator = new MonitorBrightnessIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.shutdown();
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
