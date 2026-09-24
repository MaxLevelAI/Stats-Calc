// The pickers behind the catalog, var and symbol keys.
//
// Catalog holds every command the CAS Reference Guide documents, with the
// syntax TI prints for it. The symbol palettes carry the characters printed
// above the trig, pi, ?! and = keys.

import { setModal, clearModal, refresh } from './screen.js';
import { CATALOG } from './math/catalog.js';
import { vars, isImplemented } from './math/engine.js';

/* ============================== catalog ============================== */

// Mark each entry once, so the list can show what this build actually computes.
const MARKED = CATALOG.map((e) => ({ ...e, ok: isImplemented(e.name) }));
const WORKING = MARKED.filter((e) => e.ok).length;

export function openCatalog(onPick) {
  let filter = '';
  let sel = 0;
  let onlyWorking = false;
  const matches = () => {
    let list = onlyWorking ? MARKED.filter((e) => e.ok) : MARKED;
    if (filter) list = list.filter((e) => e.name.toLowerCase().startsWith(filter.toLowerCase()));
    return list;
  };

  setModal({
    id: 'catalog',

    mount(host) {
      const list = matches();
      if (sel >= list.length) sel = Math.max(0, list.length - 1);
      const view = list.slice(Math.max(0, sel - 5), Math.max(0, sel - 5) + 11);
      const base = Math.max(0, sel - 5);

      host.innerHTML =
        '<div class="pl-panel">' +
        `<div class="pl-title">Catalog<span class="pl-count">${list.length}${onlyWorking ? '' : ` of ${MARKED.length}`}</span></div>` +
        `<div class="pl-filter">${filter ? esc(filter) : '<span class="pl-dim">type to jump · tab: working only</span>'}</div>` +
        '<div class="pl-list">' +
        (list.length
          ? view.map((e, i) =>
            `<div class="pl-row${base + i === sel ? ' sel' : ''}${e.ok ? '' : ' off'}" data-i="${base + i}">` +
            `<span class="pl-name">${esc(e.name)}</span>` +
            (e.ok ? '' : '<span class="pl-tag">not built</span>') +
            '</div>').join('')
          : '<div class="pl-empty">no match</div>') +
        '</div>' +
        `<div class="pl-sig">${list[sel] ? esc(list[sel].sig) : ''}` +
        `<span class="pl-working">${WORKING} of ${MARKED.length} work</span></div>` +
        '</div>';

      host.addEventListener('mousedown', (ev) => {
        const row = ev.target.closest('[data-i]');
        if (!row) return;
        sel = Number(row.dataset.i);
        choose();
      });
    },

    onKey(ev) {
      const { id, def } = ev;
      const list = matches();
      if (id === 'esc' || id === 'cat') { clearModal(); return true; }
      if (id === 'down') { sel = Math.min(sel + 1, list.length - 1); refresh(); return true; }
      if (id === 'up') { sel = Math.max(sel - 1, 0); refresh(); return true; }
      if (id === 'enter' || id === 'click') return choose();
      if (id === 'del') { filter = filter.slice(0, -1); sel = 0; refresh(); return true; }
      if (id === 'tab') { onlyWorking = !onlyWorking; sel = 0; refresh(); return true; }
      if (def?.letter) { filter += def.letter.toLowerCase(); sel = 0; refresh(); return true; }
      return true;
    },
  });

  function choose() {
    const list = matches();
    const e = list[sel];
    clearModal();
    if (e) onPick(`${e.name}${e.sig.includes('(') ? '(' : ' '}`);
    return true;
  }
}

/* ============================== variables ============================== */

export function openVarList(onPick) {
  const names = [...vars.keys()].sort();
  let sel = 0;

  setModal({
    id: 'varlist',

    mount(host) {
      host.innerHTML =
        '<div class="pl-panel">' +
        '<div class="pl-title">Variables</div>' +
        '<div class="pl-list">' +
        (names.length
          ? names.map((n, i) =>
            `<div class="pl-row${i === sel ? ' sel' : ''}" data-i="${i}">` +
            `<span class="pl-name">${esc(n)}</span></div>`).join('')
          : '<div class="pl-empty">none defined</div>') +
        '</div></div>';
      host.addEventListener('mousedown', (ev) => {
        const row = ev.target.closest('[data-i]');
        if (!row) return;
        sel = Number(row.dataset.i);
        choose();
      });
    },

    onKey(ev) {
      const { id } = ev;
      if (id === 'esc' || id === 'var') { clearModal(); return true; }
      if (!names.length) return true;
      if (id === 'down') { sel = Math.min(sel + 1, names.length - 1); refresh(); return true; }
      if (id === 'up') { sel = Math.max(sel - 1, 0); refresh(); return true; }
      if (id === 'enter' || id === 'click') return choose();
      return true;
    },
  });

  function choose() {
    clearModal();
    if (names[sel]) onPick(names[sel]);
    return true;
  }
}

/* ============================== symbol palettes ============================== */

// Contents follow what the keypad prints above each key.
export const PALETTES = {
  trig: {
    title: 'trig',
    items: ['sin(', 'cos(', 'tan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
      'sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(',
      'π', '°', '′', '″'],
  },
  pi: {
    title: 'π',
    items: ['π', 'θ', 'φ', 'ℯ', '∞', '∠', 'Δ', 'Σ',
      'α', 'β', 'γ', 'λ', 'μ', 'ρ', 'σ', 'ω'],
  },
  punct: {
    title: '?!',
    items: ['?', '!', '$', '¡', "'", '%', '"', ':', ';', '_', '\\', '@', '#', '&', '~', '|'],
  },
  relational: {
    title: '≠ ≥',
    items: ['=', '≠', '<', '>', '≤', '≥', '|', '⇒', '⇔',
      'and', 'or', 'not', '→', '►', '±', '√'],
  },
  symbols: {
    title: '∞ β °',
    items: ['∞', 'β', '°', '′', '″', '·', '×', '÷',
      '±', '∑', '∏', '∫', '∂', '≈', '≡', '∅'],
  },
};

export function openSymbolPalette(kind, onPick) {
  const spec = PALETTES[kind];
  if (!spec) return false;
  let sel = 0;
  const COLS = 4;

  setModal({
    id: 'symbols',

    mount(host) {
      host.innerHTML =
        '<div class="pl-panel sym">' +
        `<div class="pl-title">${esc(spec.title)}</div>` +
        '<div class="sym-grid">' +
        spec.items.map((s, i) =>
          `<div class="sym-cell${i === sel ? ' sel' : ''}" data-i="${i}">${esc(s)}</div>`).join('') +
        '</div></div>';
      host.addEventListener('mousedown', (ev) => {
        const cell = ev.target.closest('[data-i]');
        if (!cell) return;
        sel = Number(cell.dataset.i);
        choose();
      });
    },

    onKey(ev) {
      const { id } = ev;
      if (id === 'esc') { clearModal(); return true; }
      if (id === 'right') { sel = Math.min(sel + 1, spec.items.length - 1); refresh(); return true; }
      if (id === 'left') { sel = Math.max(sel - 1, 0); refresh(); return true; }
      if (id === 'down') { sel = Math.min(sel + COLS, spec.items.length - 1); refresh(); return true; }
      if (id === 'up') { sel = Math.max(sel - COLS, 0); refresh(); return true; }
      if (id === 'enter' || id === 'click') return choose();
      return true;
    },
  });

  function choose() {
    clearModal();
    onPick(spec.items[sel]);
    return true;
  }
  return true;
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
