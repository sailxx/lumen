import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'assets/readme');
const FONT_DIR = path.join(HERE, 'fonts');
const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension/metadata.json'), 'utf8'));
const SHELLS = metadata['shell-version'];
const shellRange = `${SHELLS[0]}–${SHELLS.at(-1)}`;
const VERSION = String(metadata.version);
const copy = [];

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function text(x, y, value, size, { face = 'inter', weight = 500, fill = '#F4F7FC', anchor = 'start', spacing = 0, opacity = 1, cls = '' } = {}) {
  copy.push(value);
  const family = { inter: 'Inter', golos: 'Golos', mono: 'Mono' }[face];
  return `<text class="${family}${cls ? ` ${cls}` : ''}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}">${esc(value)}</text>`;
}

const rect = (x, y, w, h, fill, rx = 0, stroke = 'none', strokeWidth = 1, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke = '#303744', width = 1, extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const reveal = (content, delay = 0) => `<g class="reveal" style="animation-delay:${delay}ms">${content}</g>`;

function card(x, y, w, h, { fill = '#10141B', stroke = '#29313D', radius = 16 } = {}) {
  return rect(x, y, w, h, fill, radius, stroke, 1.25);
}

function pill(x, y, w, label, { bright = false, mono = false, height = 28 } = {}) {
  const fill = bright ? 'url(#blue)' : '#121821';
  const stroke = bright ? '#55B2FF' : '#293441';
  const color = bright ? '#06111D' : '#B9C7D7';
  return `${rect(x, y, w, height, fill, height / 2, stroke, 1)}${circle(x + 13, y + height / 2, 2.5, bright ? '#071522' : '#2E9BFF')}${text(x + 24, y + height / 2 + 4, label, 10.5, { face: mono ? 'mono' : 'inter', weight: 600, fill: color, spacing: mono ? .3 : 0 })}`;
}

function rootSvg(width, height, label, body, { glow = true } = {}) {
  copy.push(label);
  const light = glow
    ? `<circle cx="${width * .78}" cy="${height * .14}" r="${Math.min(width, height) * .57}" fill="url(#glow)"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">
<defs>
  <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#79C8FF"/><stop offset="1" stop-color="#2188F6"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#116CC1" stop-opacity=".24"/><stop offset="1" stop-color="#116CC1" stop-opacity="0"/></radialGradient>
  <linearGradient id="line-blue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1478F0"/><stop offset="1" stop-color="#7CC4FF"/></linearGradient>
</defs>
<style>
@font-face{font-family:Inter;src:url(data:font/woff2;base64,%%INTER%%) format('woff2');font-weight:100 900}
@font-face{font-family:Golos;src:url(data:font/woff2;base64,%%GOLOS%%) format('woff2');font-weight:100 900}
@font-face{font-family:Mono;src:url(data:font/woff2;base64,%%MONO%%) format('woff2');font-weight:100 900}
.Inter{font-family:Inter,'Segoe UI',sans-serif}.Golos{font-family:Golos,Inter,sans-serif}.Mono{font-family:Mono,'Cascadia Code',monospace}
.reveal{opacity:0;transform:translateY(12px);animation:arrive 680ms cubic-bezier(.16,1,.3,1) forwards}
.trace{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 700ms cubic-bezier(.16,1,.3,1) forwards}
.glint{animation:glint 2.8s ease-in-out infinite}
@keyframes arrive{to{opacity:1;transform:translateY(0)}}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes glint{0%,100%{opacity:.55}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){.reveal,.trace,.glint{animation:none;opacity:1;transform:none;stroke-dashoffset:0}}
</style>
${rect(0, 0, width, height, '#07090D', 24)}${light}
${rect(.5, .5, width - 1, height - 1, 'none', 24, '#242B35', 1)}
${body}</svg>`;
}

function makeLogo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Lumen display brightness logo">
<defs><linearGradient id="surface" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#141B25"/><stop offset="1" stop-color="#07090D"/></linearGradient><linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#80D0FF"/><stop offset="1" stop-color="#1678E8"/></linearGradient><radialGradient id="aura"><stop stop-color="#2188F6" stop-opacity=".35"/><stop offset="1" stop-color="#2188F6" stop-opacity="0"/></radialGradient></defs>
<style>.pulse{animation:pulse 2.8s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}@media(prefers-reduced-motion:reduce){.pulse{animation:none;opacity:.55}}</style>
<rect x="8" y="8" width="240" height="240" rx="58" fill="url(#surface)" stroke="#2B3542" stroke-width="2"/>
<circle class="pulse" cx="132" cy="114" r="92" fill="url(#aura)"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M59 55h138a10 10 0 0 1 10 10v95H49V65a10 10 0 0 1 10-10Z" stroke="url(#beam)" stroke-width="9"/>
  <path d="M88 185h80m-40-25v25" stroke="#667487" stroke-width="8"/>
  <path d="M75 128h106" stroke="#344152" stroke-width="10"/>
  <path d="M75 128h62" stroke="url(#beam)" stroke-width="10"/>
</g>
<circle cx="137" cy="128" r="15" fill="#F7FBFF" stroke="#5CB8FF" stroke-width="6"/>
<circle class="pulse" cx="137" cy="128" r="28" fill="none" stroke="#46A7FF" stroke-opacity=".34" stroke-width="2"/>
<path d="M70 199h116" stroke="#1E2935" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}

function makeBadges() {
  const items = [
    ['v' + VERSION, 96, true],
    ['GNOME ' + shellRange, 148, false],
    ['DDC/CI', 112, false],
    ['FEDORA RPM', 132, false],
    ['MIT LICENSE', 138, false],
  ];
  const gap = 10;
  const total = items.reduce((n, item) => n + item[1], 0) + gap * (items.length - 1);
  let x = Math.round((880 - total) / 2);
  let body = '';
  items.forEach(([label, width, bright], i) => {
    body += reveal(pill(x, 17, width, label, { bright, mono: i === 0 || i === 1 }), i * 65);
    x += width + gap;
  });
  return rootSvg(880, 62, 'Lumen version, GNOME Shell support, DDC/CI, Fedora RPM packaging, and MIT license', body, { glow: false });
}

function makeButton({ width, label, symbol, variant = 'outline' }) {
  const fill = variant === 'primary' ? 'url(#blue)' : '#10151D';
  const border = variant === 'primary' ? '#5DB9FF' : '#303A47';
  const ink = variant === 'primary' ? '#061321' : '#E8F0F9';
  const accent = variant === 'primary' ? '#061321' : '#56B6FF';
  let icon = '';
  if (symbol === 'download') {
    icon = `<path d="M20 15v7m-4-4 4 4 4-4M16 27h8" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (symbol === 'package') {
    icon = `<path d="m20 15 7 4v8l-7 4-7-4v-8l7-4Z" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linejoin="round"/><path d="m13 19 7 4 7-4m-7 4v8" fill="none" stroke="${accent}" stroke-width="1.4" stroke-linejoin="round"/>`;
  } else {
    icon = `<path d="M20 14v13m-6-6h12m-9-9 3 3 3-3" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const body = reveal(`${rect(1, 1, width - 2, 54, fill, 15, border, 1.4)}<path d="M16 2h${width - 32}" stroke="${variant === 'primary' ? '#FFFFFF' : '#5E6A79'}" stroke-opacity=".28" stroke-linecap="round"/>${icon}${text(48, 34, label, 13, { face: 'golos', weight: 650, fill: ink })}<circle cx="${width - 22}" cy="28" r="2" fill="${accent}" class="glint"/>`);
  return rootSvg(width, 56, label, body, { glow: false });
}

function makeHero() {
  const b = [];
  b.push(reveal(text(38, 129, 'Brightness,', 38, { face: 'golos', weight: 700, fill: '#F5F8FD', spacing: -.8 })));
  b.push(reveal(text(38, 174, 'per screen.', 38, { face: 'golos', weight: 700, fill: '#F5F8FD', spacing: -.8 }), 90));
  b.push(reveal(text(40, 212, 'A single GNOME menu for your laptop', 14, { face: 'inter', fill: '#B6C3D1' }), 160));
  b.push(reveal(text(40, 233, 'panel and external monitors.', 14, { face: 'inter', fill: '#B6C3D1' }), 220));
  b.push(reveal(pill(40, 270, 176, 'NO ROOT AT RUNTIME', { mono: true }), 280));
  b.push(reveal(pill(40, 310, 188, 'NO BACKGROUND SERVICE', { mono: true }), 340));

  b.push(reveal(`${card(386, 40, 454, 398, { radius: 22 })}${text(412, 74, 'GNOME PANEL', 10, { face: 'mono', weight: 600, fill: '#90A0B1', spacing: .8 })}${pill(712, 54, 100, 'PREVIEW', { mono: true, height: 24 })}`, 100));
  b.push(reveal(`${rect(406, 92, 414, 326, '#090C11', 16, '#222B36', 1)}${circle(430, 117, 8, 'url(#blue)')}${circle(430, 117, 3, '#061321')}${text(450, 122, 'Displays', 15, { face: 'golos', weight: 650 })}${text(798, 122, '2 connected', 10.5, { face: 'inter', fill: '#8493A3', anchor: 'end' })}${line(426, 142, 800, 142, '#232D39')}`, 160));

  const rows = [
    { y: 177, name: 'Built-in display', value: '72%', ratio: 0.72, tag: 'logind' },
    { y: 274, name: 'DP-1 · DELL U2415', value: '43%', ratio: 0.43, tag: 'DDC / CI' },
  ];
  rows.forEach((row, i) => {
    const y = row.y;
    const content = `${text(430, y, row.name, 12.5, { face: 'inter', weight: 600 })}${text(796, y, row.value, 11.5, { face: 'mono', weight: 600, fill: '#C8D5E3', anchor: 'end' })}${rect(430, y + 17, 366, 6, '#2B3542', 3)}${rect(430, y + 17, Math.round(366 * row.ratio), 6, 'url(#line-blue)', 3)}${circle(430 + Math.round(366 * row.ratio), y + 20, 7, '#F4F8FC', 'stroke="#53B1FF" stroke-width="2.5"')}${pill(430, y + 34, row.tag === 'logind' ? 60 : 77, row.tag, { mono: true, height: 20 })}`;
    b.push(reveal(content, 250 + i * 100));
  });
  b.push(reveal(`${line(426, 368, 800, 368, '#232D39')}${text(430, 394, 'Refresh displays', 11.5, { face: 'inter', fill: '#B9C6D5' })}${text(796, 394, '›', 18, { face: 'inter', fill: '#72C2FF', anchor: 'end' })}`, 450));
  return rootSvg(880, 480, 'Lumen panel menu preview with independent brightness sliders for an internal and external display', b.join(''));
}

function makeFeatures() {
  const b = [];
  b.push(reveal(text(36, 55, 'The controls stay close.', 25, { face: 'golos', weight: 650, fill: '#F4F7FC' })));
  b.push(reveal(text(36, 80, 'Each screen gets its own path and its own value.', 12.5, { face: 'inter', fill: '#A9B7C7' }), 70));

  b.push(reveal(`${card(32, 104, 486, 350, { radius: 18 })}${text(56, 141, 'Independent sliders', 17, { face: 'golos', weight: 650 })}${text(56, 163, 'Adjust one display without changing another.', 11.5, { face: 'inter', fill: '#AAB7C6' })}`, 120));
  b.push(reveal(`${text(56, 211, 'Built-in display', 12, { face: 'inter', weight: 600 })}${text(492, 211, '72%', 11, { face: 'mono', fill: '#D6E2EF', anchor: 'end' })}${rect(56, 228, 436, 7, '#293441', 4)}${rect(56, 228, 314, 7, 'url(#line-blue)', 4)}${circle(370, 231.5, 7, '#F2F8FF', 'stroke="#51B2FF" stroke-width="2.5"')}${pill(56, 248, 64, 'logind', { mono: true, height: 20 })}`, 210));
  b.push(reveal(`${text(56, 302, 'DP-1 · DELL U2415', 12, { face: 'inter', weight: 600 })}${text(492, 302, '43%', 11, { face: 'mono', fill: '#D6E2EF', anchor: 'end' })}${rect(56, 319, 436, 7, '#293441', 4)}${rect(56, 319, 187, 7, 'url(#line-blue)', 4)}${circle(243, 322.5, 7, '#F2F8FF', 'stroke="#51B2FF" stroke-width="2.5"')}${pill(56, 339, 82, 'DDC / CI', { mono: true, height: 20 })}`, 300));
  b.push(reveal(`${line(56, 382, 492, 382, '#293441')}${circle(65, 414, 3.5, '#58B5FF')}${text(78, 418, 'Refresh values when the menu opens', 11.5, { face: 'inter', fill: '#C5D0DC' })}`, 390));

  b.push(reveal(`${card(536, 104, 312, 194, { radius: 18, fill: '#111720' })}${text(562, 142, 'Scroll to adjust', 16, { face: 'golos', weight: 650 })}${text(562, 166, 'A row changes that display.', 11.5, { face: 'inter', fill: '#AAB7C6' })}${text(562, 185, 'The panel icon nudges the last used.', 11.5, { face: 'inter', fill: '#AAB7C6' })}${pill(562, 212, 110, '1–25% STEP', { mono: true, height: 24 })}<g transform="translate(773 149)"><circle r="28" fill="#0A1018" stroke="#293746"/><path d="M0-16v7m0 18v7m-16-16h7m18 0h7" stroke="#53B1FF" stroke-width="2" stroke-linecap="round"/><path d="M-1-8a9 9 0 1 1-8 8" fill="none" stroke="#81CEFF" stroke-width="2" stroke-linecap="round"/></g>`, 210));
  b.push(reveal(`${card(536, 316, 312, 138, { radius: 18, fill: '#0D1219' })}${circle(570, 350, 11, 'url(#blue)')}${pathD('M566 350l3 3 6-7', '#061321', 1.7)}${text(594, 354, 'Runs in your session', 15, { face: 'golos', weight: 650 })}${text(562, 385, 'Setup may need admin access. Brightness', 11.2, { face: 'inter', fill: '#AAB7C6' })}${text(562, 403, 'changes do not need a root service.', 11.2, { face: 'inter', fill: '#AAB7C6' })}${line(562, 423, 822, 423, '#252F3B')}${text(562, 441, 'LOCAL  ·  NO DAEMON', 9.5, { face: 'mono', fill: '#65BFFF', spacing: .35 })}`, 300));
  return rootSvg(880, 492, 'Feature cards for independent sliders, scroll controls, and local session operation', b.join(''));
}

function pathD(d, fill, strokeWidth = 1) { return `<path d="${d}" fill="${fill}" stroke="none" stroke-width="${strokeWidth}"/>`; }

function makeHow() {
  const b = [];
  b.push(reveal(text(36, 56, 'One menu. Two control paths.', 25, { face: 'golos', weight: 650 })));
  b.push(reveal(text(36, 80, 'Lumen uses the interface each display already supports.', 12.5, { face: 'inter', fill: '#A9B7C7' }), 70));

  b.push(reveal(`${card(32, 108, 354, 176, { radius: 18 })}${rect(54, 128, 52, 44, '#0B131D', 12, '#253545')}${rect(65, 137, 30, 20, 'none', 3, '#55B7FF', 2)}${line(60, 162, 100, 162, '#55B7FF', 2)}${text(54, 204, 'Built-in display', 16, { face: 'golos', weight: 650 })}${text(54, 228, 'System backlight through logind', 11.5, { face: 'inter', fill: '#ACB9C7' })}${pill(54, 246, 78, 'SESSION', { mono: true, height: 22 })}`, 130));

  b.push(reveal(`${card(494, 108, 354, 176, { radius: 18, fill: '#111720' })}${rect(518, 128, 52, 44, '#0B131D', 12, '#253545')}${rect(527, 136, 34, 22, 'none', 3, '#55B7FF', 2)}${line(523, 163, 565, 163, '#55B7FF', 2)}${text(518, 204, 'External monitors', 16, { face: 'golos', weight: 650 })}${text(518, 228, 'DDC/CI commands through ddcutil', 11.5, { face: 'inter', fill: '#ACB9C7' })}${pill(518, 246, 154, 'I²C  ·  ACTIVE SESSION', { mono: true, height: 22 })}`, 230));

  b.push(reveal(`${line(390, 195, 482, 195, '#38546F', 1.5)}${circle(436, 195, 20, '#0C1825', 'stroke="#367FBC" stroke-width="1.3"')}${circle(436, 195, 6, 'url(#blue)')}${pathD('M436 181v5m0 18v5m-14-14h5m18 0h5', 'none')}<path d="M436 181v5m0 18v5m-14-14h5m18 0h5" stroke="#65BEFF" stroke-width="1.5" stroke-linecap="round"/>`, 320));
  b.push(reveal(`${rect(32, 304, 816, 48, '#0C1219', 14, '#242E3A')}${circle(54, 328, 4, '#55B7FF')}${text(70, 332, 'Both paths stay in the logged-in session. Lumen does not run a background daemon.', 11.5, { face: 'inter', fill: '#C0CBD7' })}`, 400));
  return rootSvg(880, 380, 'Built-in backlight and external monitor control paths both feed Lumen in the GNOME panel', b.join(''));
}

function makeNumbers() {
  const body = [];
  body.push(reveal(text(36, 50, 'The details are deliberate.', 23, { face: 'golos', weight: 650 })));
  body.push(reveal(`${text(38, 120, '150', 40, { face: 'mono', weight: 650, fill: '#79C8FF' })}${text(132, 119, 'ms', 15, { face: 'mono', weight: 550, fill: '#C3D3E4' })}${text(38, 147, 'brightness write debounce', 10.5, { face: 'inter', fill: '#A8B7C7' })}`, 90));
  body.push(reveal(`${line(246, 90, 246, 168, '#2A3441')}${text(280, 115, '0', 29, { face: 'mono', weight: 650, fill: '#F3F8FE' })}${text(326, 113, 'root at runtime', 11.5, { face: 'inter', fill: '#B8C6D5' })}${text(280, 144, 'Changes run in your session.', 10.5, { face: 'inter', fill: '#8898AA' })}`, 170));
  body.push(reveal(`${line(518, 90, 518, 168, '#2A3441')}${text(552, 115, '1–25%', 21, { face: 'mono', weight: 650, fill: '#F3F8FE' })}${text(552, 144, 'scroll step', 10.5, { face: 'inter', fill: '#A8B7C7' })}${text(552, 162, 'Set in Preferences.', 10.5, { face: 'inter', fill: '#8898AA' })}`, 240));
  body.push(reveal(`${line(714, 90, 714, 168, '#2A3441')}${text(748, 115, shellRange, 20, { face: 'mono', weight: 650, fill: '#F3F8FE' })}${text(748, 144, 'GNOME Shell', 10.5, { face: 'inter', fill: '#A8B7C7' })}${text(748, 162, 'supported versions', 10.5, { face: 'inter', fill: '#8898AA' })}`, 310));
  body.push(reveal(line(36, 184, 844, 184, '#293340'), 370));
  return rootSvg(880, 216, 'Lumen timing, runtime permissions, scroll range, and supported GNOME Shell versions', body.join(''), { glow: false });
}

function makeLimits() {
  const b = [];
  b.push(reveal(text(36, 52, 'External displays need two things.', 23, { face: 'golos', weight: 650 })));
  b.push(reveal(`${card(32, 82, 496, 128, { radius: 18 })}${pill(54, 101, 94, 'MONITOR OSD', { mono: true, height: 22 })}${text(54, 151, 'DDC/CI enabled', 16, { face: 'golos', weight: 650 })}${text(54, 176, 'Switch it on in the monitor’s on-screen menu.', 11.5, { face: 'inter', fill: '#AAB7C6' })}${circle(482, 143, 22, '#0A1722', 'stroke="#28435A"')}${circle(482, 143, 10, 'none', 'stroke="#62BBFF" stroke-width="2"')}${line(482, 128, 482, 135, '#62BBFF', 2)}${line(482, 151, 482, 158, '#62BBFF', 2)}${line(467, 143, 474, 143, '#62BBFF', 2)}${line(490, 143, 497, 143, '#62BBFF', 2)}`, 100));
  b.push(reveal(`${card(548, 82, 300, 128, { radius: 18, fill: '#111720' })}${pill(570, 101, 88, 'CONNECTION', { mono: true, height: 22 })}${text(570, 151, 'Docks vary', 16, { face: 'golos', weight: 650 })}${text(570, 176, 'Some adapters block the DDC/CI signal.', 10.5, { face: 'inter', fill: '#AAB7C6' })}`, 210));
  return rootSvg(880, 242, 'Enable DDC/CI in the monitor menu and check that docks or adapters pass the signal through', b.join(''));
}

function makeInstall() {
  const b = [];
  b.push(reveal(text(36, 52, 'From setup to first adjustment.', 23, { face: 'golos', weight: 650 })));
  b.push(reveal(text(36, 75, 'Three steps to bring Lumen into the panel.', 12.5, { face: 'inter', fill: '#A9B7C7' }), 60));
  const steps = [
    { x: 32, w: 250, title: 'Prepare', desc: 'Install ddcutil and set up I²C access.', code: 'setup-monitor-brightness.sh' },
    { x: 314, w: 250, title: 'Install', desc: 'Package and add the extension.', code: 'extension/install.sh' },
    { x: 596, w: 252, title: 'Enable', desc: 'Restart GNOME Shell and switch it on.', code: 'lumen@vlad' },
  ];
  steps.forEach((step, i) => {
    const fill = i === 1 ? '#111923' : '#0E131A';
    const contents = `${card(step.x, 98, step.w, 134, { radius: 16, fill })}${text(step.x + 20, 131, step.title, 16, { face: 'golos', weight: 650 })}${text(step.x + 20, 155, step.desc, 10.5, { face: 'inter', fill: '#ACBAC9' })}${line(step.x + 20, 173, step.x + step.w - 20, 173, '#28323E')}${text(step.x + 20, 201, step.code, 9.2, { face: 'mono', weight: 500, fill: '#72C3FF' })}`;
    b.push(reveal(contents, 120 + i * 80));
    if (i < steps.length - 1) b.push(reveal(`<path d="M${step.x + step.w + 6} 165h18m-6-6 6 6-6 6" fill="none" stroke="#4B7BA6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`, 200 + i * 80));
  });
  return rootSvg(880, 260, 'Installation path: set up monitor access, install the GNOME extension, then enable it', b.join(''));
}

const artifacts = new Map();
artifacts.set('badges-en.svg', makeBadges());
artifacts.set('btn-zip-en.svg', makeButton({ width: 240, label: 'Install from zip', symbol: 'download', variant: 'primary' }));
artifacts.set('btn-rpm-en.svg', makeButton({ width: 250, label: 'Build Fedora RPM', symbol: 'package' }));
artifacts.set('btn-new-en.svg', makeButton({ width: 224, label: 'Latest release', symbol: 'release' }));
artifacts.set('hero-en.svg', makeHero());
artifacts.set('features-en.svg', makeFeatures());
artifacts.set('how-en.svg', makeHow());
artifacts.set('numbers-en.svg', makeNumbers());
artifacts.set('roadmap-en.svg', makeLimits());
artifacts.set('install-en.svg', makeInstall());

const glyphs = [...new Set(copy.join('') + ' 0123456789%·–—/→₂+.’' + String.fromCodePoint(0x21B3))].join('');
const load = (name) => fs.readFileSync(path.join(FONT_DIR, name));
const subset = async (name) => (await subsetFont(load(name), glyphs, { targetFormat: 'woff2' })).toString('base64');
const [inter, golos, mono] = await Promise.all([
  subset('Inter-Variable.ttf'),
  subset('GolosText-Variable.ttf'),
  subset('JetBrainsMono-Variable.ttf'),
]);

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of artifacts) {
  const output = svg
    .replaceAll('%%INTER%%', inter)
    .replaceAll('%%GOLOS%%', golos)
    .replaceAll('%%MONO%%', mono);
  fs.writeFileSync(path.join(OUT, name), output, 'utf8');
}
fs.writeFileSync(path.join(ROOT, 'assets/logo.svg'), makeLogo(), 'utf8');
console.log(`Built ${artifacts.size} animated README assets and the Lumen logo with ${glyphs.length} glyphs per embedded font subset.`);
