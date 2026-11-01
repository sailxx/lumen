'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

function readInteger(path) {
    try {
        const [ok, bytes] = GLib.file_get_contents(path);
        if (!ok)
            return -1;

        const value = Number.parseInt(new TextDecoder().decode(bytes).trim(), 10);
        return Number.isSafeInteger(value) && value >= 0 ? value : -1;
    } catch {
        return -1;
    }
}

function backlightPriority(name) {
    if (/^(intel_backlight|amdgpu_bl|nv_backlight|radeon_bl|apple_panel_bl)/.test(name))
        return 3;
    if (/^acpi_video/.test(name))
        return 1;
    return 2;
}

export function findInternalBacklight() {
    let children = null;
    try {
        const directory = Gio.File.new_for_path('/sys/class/backlight');
        children = directory.enumerate_children(
            'standard::name', Gio.FileQueryInfoFlags.NONE, null);

        const names = [];
        let info;
        while ((info = children.next_file(null)) !== null)
            names.push(info.get_name());

        names.sort((a, b) => backlightPriority(b) - backlightPriority(a) || a.localeCompare(b));
        for (const name of names) {
            const max = readInteger(`/sys/class/backlight/${name}/max_brightness`);
            if (max > 0)
                return {name, max};
        }
    } catch {
        return null;
    } finally {
        children?.close(null);
    }

    return null;
}

export function readInternalBrightness(device) {
    if (!device || device.max <= 0)
        return null;

    const value = readInteger(`/sys/class/backlight/${device.name}/brightness`);
    if (value < 0)
        return null;

    return Math.max(0, Math.min(1, value / device.max));
}

export function writeInternalBrightness(device, fraction, cancellable) {
    if (!device || device.max <= 0)
        return Promise.reject(new Error('The built-in display backlight is unavailable'));

    const value = Math.max(0, Math.min(device.max, Math.round(fraction * device.max)));
    return new Promise((resolve, reject) => {
        Gio.DBus.system.call(
            'org.freedesktop.login1',
            '/org/freedesktop/login1/session/auto',
            'org.freedesktop.login1.Session',
            'SetBrightness',
            new GLib.Variant('(ssu)', ['backlight', device.name, value]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            cancellable,
            (connection, result) => {
                try {
                    connection.call_finish(result);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
    });
}
