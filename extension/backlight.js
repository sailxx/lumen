'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const PRIORITY_CONTROLLERS = [
    'intel_backlight',
    'amdgpu_bl',
    'apple_panel_bl',
    'nv_backlight',
    'radeon_bl',
];

export function findInternalBacklight() {
    const sysBacklight = '/sys/class/backlight';
    const dir = Gio.File.new_for_path(sysBacklight);

    if (!dir.query_exists(null))
        return null;

    try {
        const enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
        const candidates = [];
        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            const name = info.get_name();
            const childPath = `${sysBacklight}/${name}`;
            const brightnessFile = Gio.File.new_for_path(`${childPath}/brightness`);
            const maxFile = Gio.File.new_for_path(`${childPath}/max_brightness`);

            if (brightnessFile.query_exists(null) && maxFile.query_exists(null))
                candidates.push({name, path: childPath});
        }

        if (candidates.length === 0)
            return null;

        for (const preferred of PRIORITY_CONTROLLERS) {
            const match = candidates.find(c => c.name.startsWith(preferred));
            if (match)
                return match.path;
        }

        const nonAcpi = candidates.find(c => !c.name.startsWith('acpi_video'));
        if (nonAcpi)
            return nonAcpi.path;

        return candidates[0].path;
    } catch (e) {
        console.warn(`Lumen: failed scanning ${sysBacklight}: ${e.message}`);
    }

    return null;
}

export function readInternalBrightness(backlightPath) {
    try {
        const brightFile = Gio.File.new_for_path(`${backlightPath}/brightness`);
        const maxFile = Gio.File.new_for_path(`${backlightPath}/max_brightness`);

        const [, brightBytes] = brightFile.load_contents(null);
        const [, maxBytes] = maxFile.load_contents(null);

        const current = parseInt(new TextDecoder().decode(brightBytes).trim(), 10);
        const max = parseInt(new TextDecoder().decode(maxBytes).trim(), 10);

        if (max > 0 && !isNaN(current))
            return Math.round((current / max) * 100);
    } catch (e) {
        console.warn(`Lumen: failed reading internal backlight: ${e.message}`);
    }

    return null;
}

export function writeInternalBrightness(backlightPath, percent) {
    try {
        const maxFile = Gio.File.new_for_path(`${backlightPath}/max_brightness`);
        const [, maxBytes] = maxFile.load_contents(null);
        const max = parseInt(new TextDecoder().decode(maxBytes).trim(), 10);

        if (max <= 0 || isNaN(max))
            return;

        const targetVal = Math.round((Math.min(100, Math.max(0, percent)) / 100) * max);

        const bus = Gio.DBus.system;
        const params = new GLib.Variant('(ssu)', [
            'backlight',
            Gio.File.new_for_path(backlightPath).get_basename(),
            targetVal,
        ]);

        bus.call(
            'org.freedesktop.login1',
            '/org/freedesktop/login1',
            'org.freedesktop.login1.Manager',
            'SetBrightness',
            params,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (obj, res) => {
                try {
                    obj.call_finish(res);
                } catch (e) {
                    console.warn(`Lumen: logind SetBrightness failed: ${e.message}`);
                }
            }
        );
    } catch (e) {
        console.warn(`Lumen: writeInternalBrightness failed: ${e.message}`);
    }
}
