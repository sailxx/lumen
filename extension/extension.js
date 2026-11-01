'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {detectMonitors, isCancelled, readBrightness, writeBrightness} from './ddcutil.js';
import {findInternalBacklight, readInternalBrightness, writeInternalBrightness} from './backlight.js';

const SET_DEBOUNCE_MS = 150;

const BrightnessRow = GObject.registerClass({
    Signals: {'changed': {param_types: [GObject.TYPE_DOUBLE]}},
}, class BrightnessRow extends PopupMenu.PopupBaseMenuItem {
    _init(desc) {
        super._init({activate: false});

        this.desc = desc;
        this.stepPercent = 5;
        this.dragging = false;
        this.pendingWrite = false;
        this._updating = false;

        this._nameLabel = new St.Label({
            text: desc.label,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._nameLabel.add_style_class_name('lumen-name');
        this._nameLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        this._nameLabel.tooltip_text = desc.label;
        this.add_child(this._nameLabel);

        this._slider = new Slider.Slider(0);
        this._slider.x_expand = true;
        this._slider.y_align = Clutter.ActorAlign.CENTER;
        this._slider.connect('drag-begin', () => (this.dragging = true));
        this._slider.connect('drag-end', () => (this.dragging = false));
        this._slider.connect('notify::value', () => {
            if (this._updating)
                return;

            this._valueLabel.text = `${Math.round(this._slider.value * 100)}%`;
            this._valueLabel.tooltip_text = null;
            this._valueLabel.remove_style_class_name('lumen-error');
            this.pendingWrite = true;
            this.emit('changed', this._slider.value);
        });
        this.add_child(this._slider);

        this._valueLabel = new St.Label({
            text: '—',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._valueLabel.add_style_class_name('lumen-value');
        this.add_child(this._valueLabel);

        this.sensitive = false;
        this.connect('scroll-event', (actor, event) => {
            const direction = event.get_scroll_direction();
            if (!this.sensitive)
                return Clutter.EVENT_PROPAGATE;
            if (direction === Clutter.ScrollDirection.UP)
                this._nudge(this.stepPercent);
            else if (direction === Clutter.ScrollDirection.DOWN)
                this._nudge(-this.stepPercent);
            else
                return Clutter.EVENT_PROPAGATE;
            return Clutter.EVENT_STOP;
        });
    }

    _nudge(percent) {
        const next = this._slider.value + percent / 100;
        this._slider.value = Math.max(0, Math.min(1, next));
    }

    setOnline(fraction) {
        this._updating = true;
        this._slider.value = Math.max(0, Math.min(1, fraction));
        this._updating = false;
        this.pendingWrite = false;
        this.sensitive = true;
        this._valueLabel.text = `${Math.round(this._slider.value * 100)}%`;
        this._valueLabel.tooltip_text = null;
        this._valueLabel.remove_style_class_name('lumen-error');
    }

    setUnavailable(message = null) {
        this.pendingWrite = false;
        this.sensitive = false;
        this._valueLabel.text = '—';
        this._valueLabel.tooltip_text = message;
        this._valueLabel.remove_style_class_name('lumen-error');
    }

    setWriteError(message) {
        this.pendingWrite = false;
        this.sensitive = true;
        this._valueLabel.text = '!';
        this._valueLabel.tooltip_text = message;
        this._valueLabel.add_style_class_name('lumen-error');
    }

    get value() {
        return this._slider.value;
    }

    set value(value) {
        this._slider.value = Math.max(0, Math.min(1, value));
    }
});

const MonitorBrightnessIndicator = GObject.registerClass(
class MonitorBrightnessIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, extension.metadata.name, true);

        this._extension = extension;
        this._settings = extension.getSettings();
        this._cancellable = new Gio.Cancellable();
        this._scanCancellable = null;
        this._refreshCancellable = null;
        this._rows = [];
        this._timeouts = new Map();
        this._writeQueues = new Map();
        this._writeGenerations = new Map();
        this._internal = null;
        this._lastRow = null;
        this._placeholder = null;
        this._scanGeneration = 0;
        this._refreshGeneration = 0;
        this._isShutdown = false;

        this.add_child(new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon',
        }));
        this.setMenu(new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP, 0));

        this._section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._section);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const rescanItem = new PopupMenu.PopupMenuItem('Refresh displays');
        rescanItem.connect('activate', () => this.rebuild());
        this.menu.addMenuItem(rescanItem);

        const preferencesItem = new PopupMenu.PopupMenuItem('Preferences');
        preferencesItem.connect('activate', () => this._extension.openPreferences());
        this.menu.addMenuItem(preferencesItem);

        this._openId = this.menu.connect('open-state-changed', (menu, open) => {
            if (open)
                this.refreshValues();
        });
        this._scrollId = this.connect('scroll-event', (actor, event) => {
            return this._onPanelScroll(event);
        });
        this._internalId = this._settings.connect('changed::show-internal',
            () => this.rebuild());
        this._stepId = this._settings.connect('changed::scroll-step', () => {
            const step = this._settings.get_int('scroll-step');
            this._rows.forEach(row => (row.stepPercent = step));
        });

        this.rebuild();
    }

    rebuild() {
        if (this._isShutdown)
            return;

        this._scanGeneration++;
        const scanGeneration = this._scanGeneration;
        this._scanCancellable?.cancel();
        this._scanCancellable = new Gio.Cancellable();
        this._refreshCancellable?.cancel();
        this._refreshCancellable = null;
        this._refreshGeneration++;
        this._clearRows();

        this._placeholder = new PopupMenu.PopupMenuItem('Scanning for displays…');
        this._placeholder.sensitive = false;
        this._section.addMenuItem(this._placeholder);

        detectMonitors(this._scanCancellable).then(monitors => {
            if (!this._isCurrentScan(scanGeneration))
                return;
            this._dropPlaceholder();

            const showInternal = this._settings.get_boolean('show-internal');
            this._internal = showInternal ? findInternalBacklight() : null;
            if (this._internal) {
                this._addRow({
                    id: 'internal',
                    label: 'Built-in display',
                    kind: 'internal',
                    device: this._internal,
                });
            }

            for (const monitor of monitors) {
                const isBuiltInConnector = monitor.connector &&
                    /^(eDP|LVDS)/i.test(monitor.connector);
                if (isBuiltInConnector && (!showInternal || this._internal))
                    continue;

                const label = monitor.connector && monitor.name
                    ? `${monitor.connector} · ${monitor.name}`
                    : monitor.connector ?? monitor.name ?? `Display ${monitor.display}`;
                this._addRow({
                    id: `ddc-${monitor.display}`,
                    label,
                    kind: 'ddc',
                    bus: monitor.bus,
                    display: monitor.display,
                });
            }

            if (this._rows.length === 0) {
                this._showMessage('No controllable displays found. Check DDC/CI and scan again.');
                return;
            }

            this.refreshValues();
        }).catch(error => {
            if (isCancelled(error) || !this._isCurrentScan(scanGeneration))
                return;

            this._dropPlaceholder();
            this._showMessage('Could not scan displays. Check that ddcutil is installed and try again.');
            console.error(`Lumen: display scan failed: ${error.message}`);
        });
    }

    _addRow(description) {
        const row = new BrightnessRow(description);
        row.stepPercent = this._settings.get_int('scroll-step');
        row.connect('changed', (changedRow, fraction) => this._onRowChanged(changedRow, fraction));
        this._section.addMenuItem(row);
        this._rows.push(row);
        return row;
    }

    _showMessage(message) {
        const item = new PopupMenu.PopupMenuItem(message);
        item.sensitive = false;
        this._section.addMenuItem(item);
    }

    _onRowChanged(row, fraction) {
        this._lastRow = row;
        this._refreshGeneration++;
        this._refreshCancellable?.cancel();

        const id = row.desc.id;
        const generation = (this._writeGenerations.get(id) ?? 0) + 1;
        this._writeGenerations.set(id, generation);

        const existingTimeout = this._timeouts.get(id);
        if (existingTimeout !== undefined)
            GLib.source_remove(existingTimeout);

        const timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SET_DEBOUNCE_MS, () => {
            this._timeouts.delete(id);
            this._queueWrite(row, fraction, generation);
            return GLib.SOURCE_REMOVE;
        });
        this._timeouts.set(id, timeout);
    }

    _queueWrite(row, fraction, generation) {
        const id = row.desc.id;
        const previousWrite = this._writeQueues.get(id) ?? Promise.resolve();
        const write = previousWrite.catch(() => {}).then(() => {
            if (this._cancellable.is_cancelled())
                throw new Error('Lumen is shutting down');

            if (row.desc.kind === 'internal')
                return writeInternalBrightness(row.desc.device, fraction, this._cancellable);

            return writeBrightness(row.desc, Math.round(fraction * 100), this._cancellable);
        });
        this._writeQueues.set(id, write);

        write.then(() => {
            if (this._isCurrentRow(row) && this._writeGenerations.get(id) === generation)
                row.setOnline(fraction);
        }).catch(error => {
            if (isCancelled(error) || !this._isCurrentRow(row) ||
                this._writeGenerations.get(id) !== generation)
                return;

            row.setWriteError(error.message);
            console.error(`Lumen: brightness update failed: ${error.message}`);
        }).finally(() => {
            if (this._writeQueues.get(id) === write)
                this._writeQueues.delete(id);
        });
    }

    async refreshValues() {
        if (this._isShutdown || this._rows.length === 0)
            return;

        this._refreshCancellable?.cancel();
        const cancellable = new Gio.Cancellable();
        this._refreshCancellable = cancellable;
        const refreshGeneration = ++this._refreshGeneration;
        const scanGeneration = this._scanGeneration;

        for (const row of [...this._rows]) {
            if (!this._isCurrentRow(row, scanGeneration, refreshGeneration))
                return;
            if (row.dragging || row.pendingWrite)
                continue;

            if (row.desc.kind === 'internal') {
                const fraction = readInternalBrightness(row.desc.device);
                if (fraction === null)
                    row.setUnavailable('The built-in display brightness could not be read.');
                else
                    row.setOnline(fraction);
                continue;
            }

            try {
                const value = await readBrightness(row.desc, cancellable);
                if (!this._isCurrentRow(row, scanGeneration, refreshGeneration))
                    return;
                if (!row.dragging && !row.pendingWrite)
                    row.setOnline(value.frac);
            } catch (error) {
                if (isCancelled(error))
                    return;
                if (this._isCurrentRow(row, scanGeneration, refreshGeneration)) {
                    row.setUnavailable(error.message);
                    console.debug(`Lumen: brightness read failed: ${error.message}`);
                }
            }
        }
    }

    _isCurrentScan(scanGeneration) {
        return !this._isShutdown && scanGeneration === this._scanGeneration;
    }

    _isCurrentRow(row, scanGeneration = this._scanGeneration,
        refreshGeneration = this._refreshGeneration) {
        return this._isCurrentScan(scanGeneration) &&
            refreshGeneration === this._refreshGeneration && this._rows.includes(row);
    }

    _onPanelScroll(event) {
        const direction = event.get_scroll_direction();
        if (direction !== Clutter.ScrollDirection.UP &&
            direction !== Clutter.ScrollDirection.DOWN)
            return Clutter.EVENT_PROPAGATE;

        const row = this._lastRow?.sensitive
            ? this._lastRow
            : this._rows.find(candidate => candidate.sensitive);
        if (!row)
            return Clutter.EVENT_PROPAGATE;

        const delta = direction === Clutter.ScrollDirection.UP
            ? row.stepPercent
            : -row.stepPercent;
        row.value += delta / 100;
        return Clutter.EVENT_STOP;
    }

    _dropPlaceholder() {
        if (this._placeholder) {
            this._placeholder.destroy();
            this._placeholder = null;
        }
    }

    _clearRows() {
        for (const timeout of this._timeouts.values())
            GLib.source_remove(timeout);
        this._timeouts.clear();
        this._section.removeAll();
        this._dropPlaceholder();
        this._rows = [];
        this._lastRow = null;
        this._internal = null;
    }

    shutdown() {
        if (this._isShutdown)
            return;

        this._isShutdown = true;
        this._scanGeneration++;
        this._refreshGeneration++;
        this._scanCancellable?.cancel();
        this._refreshCancellable?.cancel();
        this._cancellable.cancel();
        this._clearRows();
        this._settings.disconnect(this._internalId);
        this._settings.disconnect(this._stepId);
        this.menu.disconnect(this._openId);
        this.disconnect(this._scrollId);
    }
});

export default class MonitorBrightnessExtension extends Extension {
    enable() {
        this._indicator = new MonitorBrightnessIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (!this._indicator)
            return;

        this._indicator.shutdown();
        this._indicator.destroy();
        this._indicator = null;
    }
}
