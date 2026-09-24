// Builds the physical keypad DOM and turns clicks / real keystrokes into
// canonical key events.  Modifiers are *sticky*, exactly like the handheld:
// press ctrl, release it, then press the next key.

import { TOP_KEYS, NUM_KEYS, ALPHA_KEYS, KBD_MAP, KEY_BY_ID } from './keys.js';

export const mods = { ctrl: false, shift: false, caps: false };

let listener = () => {};
let onModsChange = () => {};

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function makeKey(def) {
  const k = el('div', 'key', def.label ?? '');
  k.dataset.key = def.id;
  if (def.tone) k.classList.add('tone-' + def.tone);
  return k;
}

function makeCell(def, extraCls) {
  const cell = el('div', 'cell' + (extraCls ? ' ' + extraCls : ''));
  cell.appendChild(el('div', 'sub', def.sub ?? ''));
  cell.appendChild(makeKey(def));
  return cell;
}

/* ------------------------------ rendering ------------------------------ */

function renderTop() {
  for (const side of ['left', 'right']) {
    const host = document.querySelector('.col-' + side);
    host.innerHTML = '';
    TOP_KEYS.filter((k) => k.col === side)
      .sort((a, b) => a.row - b.row)
      .forEach((def) => host.appendChild(makeCell(def)));
  }
}

// Keys moulded as a single split cap sit flush against their partner.
const PAIRS = [
  ['equals', 'trig'], ['caret', 'sq'], ['ex', 'tenx'], ['lparen', 'rparen'],
  ['templ', 'cat'], ['mul', 'div'], ['plus', 'minus'],
];

function renderNum() {
  const host = document.getElementById('num-block');
  host.innerHTML = '';
  const leftOf = new Set(PAIRS.map((p) => p[0]));
  const rightOf = new Set(PAIRS.map((p) => p[1]));

  for (const def of NUM_KEYS) {
    let cls = '';
    if (leftOf.has(def.id)) cls = 'tight-l';
    else if (rightOf.has(def.id)) cls = 'tight-r';
    if (def.narrow) cls = 'narrow';

    const cell = makeCell(def, cls);
    cell.style.gridRow = String(def.r + 1);
    cell.style.gridColumn = def.span ? `${def.c} / span ${def.span}` : String(def.c);

    const key = cell.querySelector('.key');
    if (leftOf.has(def.id)) key.classList.add('pair-l');
    if (rightOf.has(def.id)) key.classList.add('pair-r');

    host.appendChild(cell);
  }
}

function renderAlpha() {
  const host = document.getElementById('alpha-block');
  host.innerHTML = '';
  for (const def of ALPHA_KEYS) {
    const k = makeKey(def);
    k.style.gridRow = String(def.r + 1);
    k.style.gridColumn = def.span ? `${def.c} / span ${def.span}` : String(def.c);
    host.appendChild(k);
  }
}

/* ------------------------------ dispatch ------------------------------ */

function flash(id) {
  const node = document.querySelector(`[data-key="${CSS.escape(id)}"]`);
  if (!node) return;
  node.classList.add('down');
  setTimeout(() => node.classList.remove('down'), 90);
}

function syncModVisuals() {
  for (const id of ['ctrl', 'shift']) {
    const node = document.querySelector(`[data-key="${id}"]`);
    if (node) node.classList.toggle('down', mods[id]);
  }
  onModsChange({ ...mods });
}

/**
 * Feed a canonical key id through the modifier state machine and out to the
 * active screen.  Returns the event that was dispatched (or null for a
 * modifier press, which is consumed here).
 */
export function press(id) {
  flash(id);

  if (id === 'ctrl') {
    if (mods.shift) { mods.shift = false; mods.caps = !mods.caps; }
    else mods.ctrl = !mods.ctrl;
    syncModVisuals();
    return null;
  }
  if (id === 'shift') {
    if (mods.ctrl) { mods.ctrl = false; mods.caps = !mods.caps; }
    else mods.shift = !mods.shift;
    syncModVisuals();
    return null;
  }

  const ev = {
    id,
    ctrl: mods.ctrl,
    shift: mods.shift || mods.caps,
    def: KEY_BY_ID[id] ?? { id },
  };
  // sticky modifiers clear after one use; caps lock persists
  mods.ctrl = false;
  mods.shift = false;
  syncModVisuals();

  listener(ev);
  return ev;
}

/* ------------------------------ wiring ------------------------------ */

export function initKeypad(handler, modsHandler) {
  listener = handler || (() => {});
  onModsChange = modsHandler || (() => {});

  renderTop();
  renderNum();
  renderAlpha();

  document.getElementById('device').addEventListener('mousedown', (e) => {
    const node = e.target.closest('[data-key]');
    if (!node) return;
    e.preventDefault();
    press(node.dataset.key);
  });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey) return;

    // Real ctrl/shift act as the handheld's sticky modifiers when pressed alone.
    if (e.key === 'Control' || e.key === 'Shift') return;

    let id = KBD_MAP[e.key];
    if (!id && /^[a-zA-Z]$/.test(e.key)) id = 'L' + e.key.toUpperCase();
    if (!id) return;

    e.preventDefault();
    if (e.ctrlKey) mods.ctrl = true;
    if (e.shiftKey && /^[a-zA-Z]$/.test(e.key)) mods.shift = true;
    press(id);
  });

  syncModVisuals();
}
