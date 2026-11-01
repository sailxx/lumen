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
        this.updating = false;

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
        this._slider.connect('drag-begin', () => { this.dragging = true; });
        this._slider.connect('drag-end', () => { this.dragging = false; });
        this._slider.connect('notify::value', () => {
            if (this._updating)
                return;
            this.emit('changed', this._slider.value);
        });
        this.add_child(this._slider);

        this._valueLabel = new St.Label({
            text: '--%',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._valueLabel.add_style_class_name('lumen-value');
        this.add_child(this._valueLabel);

        this._scrollEventId = this.connect('scroll-event', (_actor, event) => {
            const direction = event.get_scroll_direction();
            let delta = 0;
            if (direction === Clutter.ScrollDirection.UP)
                delta = this.stepPercent / 100;
            else if (direction === Clutter.ScrollDirection.DOWN)
                delta = -this.stepPercent / 100;
            else if (direction === Clutter.ScrollDirection.SMOOTH) {
                const [, dy] = event.get_scroll_delta();
                if (dy < 0)
                    delta = this.stepPercent / 100;
                else if (dy > 0)
                    delta = -this.stepPercent / 100;
            }

            if (delta === 0)
                return Clutter.EVENT_PROPAGATE;

            const nextValue = Math.min(1, Math.max(0, this._slider.value + delta));
            if (nextValue !== this._slider.value) {
                this._slider.value = nextValue;
                this.emit('changed', nextValue);
            }
            return Clutter.EVENT_STOP;
        });
    }

    setPercent(pct) {
        if (pct < 0 || pct > 100)
            return;

        this._updating = true;
        this._slider.value = pct / 100;
        this._valueLabel.text = `${pct}%`;
        this._updating = false;
    }

    step(direction) {
        const delta = (direction * this.stepPercent) / 100;
        const nextValue = Math.min(1, Math.max(0, this._slider.value + delta));
        if (nextValue !== this._slider.value) {
            this._slider.value = nextValue;
            this.emit('changed', nextValue);
        }
    }
});

export default class MonitorBrightnessExtension extends Extension {
    enable() {
        this._monitors = [];
        this._rows = [];
        this._activeRow = null;
        this._writeDebounceSourceId = 0;
        this._writeCancellable = null;
        this._readCancellable = null;
        this._detectCancellable = null;

        this._settings = this.getSettings();
        this._stepSettingId = this._settings.connect('changed::scroll-step', () => {
            this._applyStepPercent();
        });
        this._showInternalSettingId = this._settings.connect('changed::show-internal', () => {
            this._refreshMonitors();
        });

        this._indicator = new PanelMenu.Button(0.0, 'Lumen', false);
        this._icon = new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon',
        });
        this._indicator.add_child(this._icon);

        this._panelScrollEventId = this._indicator.connect('scroll-event', (_actor, event) => {
            const direction = event.get_scroll_direction();
            let stepDir = 0;
            if (direction === Clutter.ScrollDirection.UP)
                stepDir = 1;
            else if (direction === Clutter.ScrollDirection.DOWN)
                stepDir = -1;
            else if (direction === Clutter.ScrollDirection.SMOOTH) {
                const [, dy] = event.get_scroll_delta();
                if (dy < 0)
                    stepDir = 1;
                else if (dy > 0)
                    stepDir = -1;
            }

            if (stepDir === 0)
                return Clutter.EVENT_PROPAGATE;

            const targetRow = this._activeRow || this._rows[0];
            if (targetRow)
                targetRow.step(stepDir);

            return Clutter.EVENT_STOP;
        });

        this._menuOpenEventId = this._indicator.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._readAllBrightness();
        });

        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this._refreshMonitors();
        });

        Main.panel.addToStatusArea(this.metadata.uuid, this._indicator);
        this._refreshMonitors();
    }

    disable() {
        if (this._writeDebounceSourceId) {
            GLib.source_remove(this._writeDebounceSourceId);
            this._writeDebounceSourceId = 0;
        }

        this._cancelOperations();

        if (this._stepSettingId && this._settings) {
            this._settings.disconnect(this._stepSettingId);
            this._stepSettingId = 0;
        }
        if (this._showInternalSettingId && this._settings) {
            this._settings.disconnect(this._showInternalSettingId);
            this._showInternalSettingId = 0;
        }
        this._settings = null;

        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = 0;
        }

        if (this._panelScrollEventId && this._indicator) {
            this._indicator.disconnect(this._panelScrollEventId);
            this._panelScrollEventId = 0;
        }

        if (this._menuOpenEventId && this._indicator?.menu) {
            this._indicator.menu.disconnect(this._menuOpenEventId);
            this._menuOpenEventId = 0;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        this._monitors = [];
        this._rows = [];
        this._activeRow = null;
    }

    _applyStepPercent() {
        const step = this._settings ? this._settings.get_int('scroll-step') : 5;
        for (const row of this._rows)
            row.stepPercent = step;
    }

    _cancelOperations() {
        if (this._detectCancellable) {
            this._detectCancellable.cancel();
            this._detectCancellable = null;
        }

        if (this._readCancellable) {
            this._readCancellable.cancel();
            this._readCancellable = null;
        }

        if (this._writeCancellable) {
            this._writeCancellable.cancel();
            this._writeCancellable = null;
        }
    }

    async _refreshMonitors() {
        this._cancelOperations();

        this._indicator.menu.removeAll();
        this._rows = [];
        this._monitors = [];

        const loadingItem = new PopupMenu.PopupMenuItem('Detecting displays...', {reactive: false});
        this._indicator.menu.addMenuItem(loadingItem);

        const detectCancellable = new Gio.Cancellable();
        this._detectCancellable = detectCancellable;

        let ddcMonitors = [];
        try {
            ddcMonitors = await detectMonitors(detectCancellable);
        } catch (e) {
            if (!isCancelled(e))
                console.warn(`Lumen: ddcutil detection failed: ${e.message}`);
        }

        if (detectCancellable.is_cancelled())
            return;

        const showInternal = this._settings ? this._settings.get_boolean('show-internal') : true;
        const backlightPath = showInternal ? findInternalBacklight() : null;
        if (backlightPath) {
            ddcMonitors.unshift({
                bus: null,
                label: 'Built-in Display',
                display: 0,
                isBacklight: true,
                backlightPath,
            });
        }

        this._indicator.menu.removeAll();

        if (ddcMonitors.length === 0) {
            const emptyItem = new PopupMenu.PopupMenuItem('No supported displays found', {reactive: false});
            this._indicator.menu.addMenuItem(emptyItem);
            this._addRefreshItem();
            return;
        }

        this._monitors = ddcMonitors;

        for (const desc of ddcMonitors) {
            const row = new BrightnessRow(desc);
            this._rows.push(row);
            this._indicator.menu.addMenuItem(row);

            row.connect('changed', (_row, value) => {
                this._activeRow = row;
                row.pendingWrite = true;
                row._valueLabel.text = `${Math.round(value * 100)}%`;
                this._scheduleWrite();
            });
        }

        this._applyStepPercent();
        this._addRefreshItem();
        this._readAllBrightness();
    }

    _addRefreshItem() {
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const refreshItem = new PopupMenu.PopupMenuItem('Refresh displays');
        refreshItem.connect('activate', () => {
            this._refreshMonitors();
        });
        this._indicator.menu.addMenuItem(refreshItem);

        const settingsItem = new PopupMenu.PopupMenuItem('Settings');
        settingsItem.connect('activate', () => {
            this.openPreferences();
        });
        this._indicator.menu.addMenuItem(settingsItem);
    }

    async _readAllBrightness() {
        if (this._readCancellable)
            this._readCancellable.cancel();

        const readCancellable = new Gio.Cancellable();
        this._readCancellable = readCancellable;

        for (let i = 0; i < this._monitors.length; i++) {
            const desc = this._monitors[i];
            const row = this._rows[i];

            if (!row || row.dragging || row.pendingWrite)
                continue;

            try {
                let pct = null;
                if (desc.isBacklight)
                    pct = readInternalBrightness(desc.backlightPath);
                else
                    pct = await readBrightness(desc.bus, readCancellable);

                if (readCancellable.is_cancelled())
                    return;

                if (pct !== null && !row.dragging && !row.pendingWrite)
                    row.setPercent(pct);
            } catch (e) {
                if (isCancelled(e))
                    return;
                console.warn(`Lumen: failed reading brightness for ${desc.label}: ${e.message}`);
            }
        }
    }

    _scheduleWrite() {
        if (this._writeDebounceSourceId)
            GLib.source_remove(this._writeDebounceSourceId);

        this._writeDebounceSourceId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            SET_DEBOUNCE_MS,
            () => {
                this._writeDebounceSourceId = 0;
                this._flushWrites();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    async _flushWrites() {
        if (this._writeCancellable)
            this._writeCancellable.cancel();

        const writeCancellable = new Gio.Cancellable();
        this._writeCancellable = writeCancellable;

        for (let i = 0; i < this._monitors.length; i++) {
            const desc = this._monitors[i];
            const row = this._rows[i];

            if (!row || !row.pendingWrite)
                continue;

            row.pendingWrite = false;
            const pct = Math.round(row._slider.value * 100);

            try {
                if (desc.isBacklight)
                    writeInternalBrightness(desc.backlightPath, pct);
                else
                    await writeBrightness(desc.bus, pct, writeCancellable);
            } catch (e) {
                if (!isCancelled(e))
                    console.warn(`Lumen: failed setting brightness for ${desc.label}: ${e.message}`);
            }
        }
    }
}
