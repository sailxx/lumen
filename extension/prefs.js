'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/shell/misc/extensionPreferences.js';

export default class MonitorBrightnessPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'display-brightness-symbolic',
        });
        const displayGroup = new Adw.PreferencesGroup({
            title: 'Displays',
            description: 'Choose which brightness controls appear in the panel menu.',
        });

        const internalRow = new Adw.ActionRow({
            title: 'Built-in display',
            subtitle: 'Show the laptop display brightness control',
        });
        const internalSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean('show-internal'),
        });
        internalSwitch.connect('notify::active', () =>
            settings.set_boolean('show-internal', internalSwitch.active));
        const internalSettingsId = settings.connect('changed::show-internal', () =>
            (internalSwitch.active = settings.get_boolean('show-internal')));
        internalRow.add_suffix(internalSwitch);
        internalRow.activatable_widget = internalSwitch;
        displayGroup.add(internalRow);

        const scrollGroup = new Adw.PreferencesGroup({title: 'Scrolling'});
        const stepRow = new Adw.ActionRow({
            title: 'Brightness step',
            subtitle: 'Change applied by each vertical scroll step',
        });
        const stepButton = new Gtk.SpinButton({
            valign: Gtk.Align.CENTER,
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 25,
                step_increment: 1,
                value: settings.get_int('scroll-step'),
            }),
        });
        stepButton.connect('value-changed', () =>
            settings.set_int('scroll-step', stepButton.value));
        const stepSettingsId = settings.connect('changed::scroll-step', () =>
            (stepButton.value = settings.get_int('scroll-step')));
        stepRow.add_suffix(stepButton);
        scrollGroup.add(stepRow);

        page.add(displayGroup);
        page.add(scrollGroup);
        window.add(page);

        window.connect('close-request', () => {
            settings.disconnect(internalSettingsId);
            settings.disconnect(stepSettingsId);
            return false;
        });
    }
}
