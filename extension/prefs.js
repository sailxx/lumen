'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/shell/misc/extensionPreferences.js';

export default class MonitorBrightnessPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Monitor Brightness',
            icon_name: 'display-brightness-symbolic',
        });
        const group = new Adw.PreferencesGroup({title: 'Поведение'});

        const internalRow = new Adw.ActionRow({
            title: 'Встроенный экран',
            subtitle: 'Показывать слайдер яркости ноутбука в меню',
        });
        const internalSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean('show-internal'),
        });
        internalSwitch.connect('notify::active', () =>
            settings.set_boolean('show-internal', internalSwitch.active));
        settings.connect('changed::show-internal', () =>
            (internalSwitch.active = settings.get_boolean('show-internal')));
        internalRow.add_suffix(internalSwitch);
        internalRow.activatable_widget = internalSwitch;
        group.add(internalRow);

        const stepRow = new Adw.ActionRow({
            title: 'Шаг прокрутки, %',
            subtitle: 'Насколько менять яркость при прокрутке колесом на иконке или строке слайдера',
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
        settings.connect('changed::scroll-step', () =>
            (stepButton.value = settings.get_int('scroll-step')));
        stepRow.add_suffix(stepButton);
        group.add(stepRow);

        page.add(group);
        window.add(page);
    }
}
