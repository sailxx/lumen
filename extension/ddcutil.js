'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const VCP_BRIGHTNESS = 0x10;
const PROCESS_FLAGS = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE;
const PROCESS_TIMEOUT_MS = 30000;

function execAsync(argv, cancellable) {
    return new Promise((resolve, reject) => {
        let process;
        try {
            process = Gio.Subprocess.new(argv, PROCESS_FLAGS);
        } catch (error) {
            reject(error);
            return;
        }

        let timedOut = false;
        let timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, PROCESS_TIMEOUT_MS, () => {
            timeoutId = 0;
            timedOut = true;
            process.force_exit();
            return GLib.SOURCE_REMOVE;
        });
        const cancellationId = cancellable?.connect(() => process.force_exit()) ?? 0;

        process.communicate_utf8_async(null, cancellable, (proc, result) => {
            if (timeoutId) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
            }
            if (cancellationId) {
                try {
                    cancellable.disconnect(cancellationId);
                } catch {
                    // The cancellable may already be disposing its handlers.
                }
            }

            try {
                const [, stdout, stderr] = proc.communicate_utf8_finish(result);
                if (timedOut)
                    throw new Error('ddcutil did not respond within 30 seconds');
                if (!proc.get_successful()) {
                    const detail = stderr?.trim();
                    const status = proc.get_if_exited()
                        ? `exit status ${proc.get_exit_status()}`
                        : 'the process did not exit normally';
                    throw new Error(detail || `ddcutil failed with ${status}`);
                }
                resolve(stdout ?? '');
            } catch (error) {
                reject(timedOut
                    ? new Error('ddcutil did not respond within 30 seconds')
                    : error);
            }
        });
    });
}

function parseNumber(value) {
    if (!value)
        return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function cleanMonitorName(value) {
    if (!value)
        return null;

    return value.trim()
        .replace(/^_[A-Z0-9]{3}\s+/i, '')
        .replace(/\s+/g, ' ');
}

export function parseDdcDetect(output) {
    const monitors = [];
    let current = null;
    let manufacturer = null;

    const finishMonitor = () => {
        if (!current)
            return;

        current.name = cleanMonitorName(
            current.name ?? current.model ?? manufacturer ?? null);
        monitors.push(current);
    };

    for (const rawLine of output.split('\n')) {
        const line = rawLine.trim();
        let match = line.match(/^Display\s+(\d+)/i);
        if (match) {
            finishMonitor();
            current = {
                display: Number(match[1]),
                bus: null,
                connector: null,
                name: null,
                model: null,
            };
            manufacturer = null;
            continue;
        }

        if (!current)
            continue;

        match = line.match(/^I2C bus:\s*\/dev\/i2c-(\d+)/i);
        if (match) {
            current.bus = Number(match[1]);
            continue;
        }

        match = line.match(/^DRM connector:\s+\S+?-([A-Za-z0-9_-]+)/i);
        if (match) {
            current.connector = match[1];
            continue;
        }

        match = line.match(/^Monitor:\s*(.+)$/i);
        if (match) {
            current.name = match[1];
            continue;
        }

        match = line.match(/^Mfg id:\s*(.+)$/i);
        if (match) {
            manufacturer = match[1].trim();
            continue;
        }

        match = line.match(/^Model:\s*(.+)$/i);
        if (match)
            current.model = match[1].trim();
    }

    finishMonitor();
    return monitors;
}

export function parseGetvcp(output) {
    const match = output.match(/current value\s*=\s*(0x[\da-f]+|\d+)\s*,\s*max value\s*=\s*(0x[\da-f]+|\d+)/i);
    if (!match)
        return null;

    const current = parseNumber(match[1]);
    const max = parseNumber(match[2]);
    if (current === null || max === null || max <= 0 || current > max)
        return null;

    return {current, max, frac: current / max};
}

function targetArgs(monitor) {
    if (Number.isInteger(monitor.bus) && monitor.bus >= 0)
        return ['--bus', String(monitor.bus)];
    return ['--display', String(monitor.display)];
}

export async function detectMonitors(cancellable) {
    return parseDdcDetect(await execAsync(['ddcutil', 'detect'], cancellable));
}

export async function readBrightness(monitor, cancellable) {
    const output = await execAsync([
        'ddcutil', 'getvcp', String(VCP_BRIGHTNESS), ...targetArgs(monitor),
    ], cancellable);
    const value = parseGetvcp(output);
    if (!value)
        throw new Error('ddcutil returned an invalid brightness value');
    return value;
}

export function writeBrightness(monitor, percent, cancellable) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    return execAsync([
        'ddcutil', 'setvcp', String(VCP_BRIGHTNESS), String(value), ...targetArgs(monitor),
    ], cancellable);
}

export function isCancelled(error) {
    return error && typeof error.matches === 'function' &&
        error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED);
}
