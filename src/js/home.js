// The Home screen.  Layout, wording and ordering all match the handheld:
// Scratchpad (A Calculate / B Graph) on the left, Documents (1-5) on the
// right, and the seven-application dock across the bottom.

import { setView, refresh } from './screen.js';
import { APPS, openApp } from './apps/registry.js';
import { openScratchpad } from './scratchpad.js';
import { openMyDocuments, openSettings } from './docui.js';
import * as D from './doc.js';

export const SCRATCH_ITEMS = [
  { key: 'A', label: 'Calculate', action: () => openScratchpad('calculator') },
  { key: 'B', label: 'Graph', action: () => openScratchpad('graphs') },
];

export const DOC_ITEMS = [
  { key: '1', label: 'New Document', action: () => D.newDocument() },
  { key: '2', label: 'My Documents', action: () => openMyDocuments() },
  { key: '3', label: 'Recent', arrow: true, action: () => openMyDocuments() },
  { key: '4', label: 'Current', action: () => (D.page() ? D.show() : D.newDocument()) },
  { key: '5', label: 'Settings', arrow: true, action: () => openSettings() },
];

// Dock icons, left to right, exactly as they sit on the handheld.
const DOCK_SVG = {
  calculator:
    '<svg viewBox="0 0 28 28"><g stroke="#fff" stroke-width="1.6" fill="none">' +
    '<path d="M14 3v22M3 14h22"/></g>' +
    '<g fill="#fff" font-family="Arial" font-size="9" text-anchor="middle">' +
    '<text x="8" y="11">×</text><text x="20" y="11">÷</text>' +
    '<text x="8" y="23">+</text><text x="20" y="23">−</text></g></svg>',
  graphs:
    '<svg viewBox="0 0 28 28"><g stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round">' +
    '<path d="M8 5v18"/><path d="M8 20c0 3 3 4 5 4s5-1 5-4V9"/></g></svg>',
  geometry:
    '<svg viewBox="0 0 28 28"><path d="M6 5v18h18z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  lists:
    '<svg viewBox="0 0 28 28"><g stroke="#fff" stroke-width="1.3" fill="none">' +
    '<rect x="4" y="5" width="20" height="18"/><path d="M4 11h20M4 17h20M11 5v18M18 5v18"/></g></svg>',
  stats:
    '<svg viewBox="0 0 28 28"><g fill="#fff">' +
    '<rect x="6" y="14" width="4" height="9"/><rect x="12" y="7" width="4" height="16"/>' +
    '<rect x="18" y="11" width="4" height="12"/></g></svg>',
  notes:
    '<svg viewBox="0 0 28 28"><g stroke="#c0392b" stroke-width="1.2" fill="none">' +
    '<path d="M8 6h13v17H8z" stroke="#7a5a63"/><path d="M11 10h7M11 13h7M11 16h7M11 19h4"/></g></svg>',
  dataquest:
    '<svg viewBox="0 0 28 28"><path d="M12 4v7L6 23h16l-6-12V4" fill="none" stroke="#fff" ' +
    'stroke-width="1.7" stroke-linejoin="round"/><path d="M10 4h8" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

// selection: { zone: 'scratch' | 'docs' | 'dock', i: number }
let sel = { zone: 'scratch', i: 0 };

function itemRow(item, x, y, w, selected) {
  return (
    `<div class="hs-item${selected ? ' sel' : ''}" style="left:${x}px;top:${y}px;width:${w}px" ` +
    `data-act="${item.zone}" data-i="${item.i}">` +
    `<span class="hs-badge">${item.key}</span>` +
    `<span class="hs-label">${item.label}</span>` +
    (item.arrow ? '<span class="hs-arrow">▸</span>' : '') +
    '</div>'
  );
}

export const homeView = {
  id: 'home',
  title: 'CAS',

  mount(host) {
    let html = '';

    // ---- Scratchpad column ----
    html += '<div class="hs-head-ico ico-scratch" style="left:15px;top:33px"></div>';
    html += '<div class="hs-head" style="left:36px;top:33px">Scratchpad</div>';
    SCRATCH_ITEMS.forEach((it, i) => {
      html += itemRow(
        { ...it, zone: 'scratch', i }, 10, 52 + i * 25, 158,
        sel.zone === 'scratch' && sel.i === i
      );
    });

    // ---- Documents column ----
    html += '<div class="hs-head-ico ico-docs" style="left:186px;top:33px;width:11px"></div>';
    html += '<div class="hs-head" style="left:204px;top:33px">Documents</div>';
    DOC_ITEMS.forEach((it, i) => {
      html += itemRow(
        { ...it, zone: 'docs', i }, 182, 52 + i * 21, 132,
        sel.zone === 'docs' && sel.i === i
      );
    });

    // ---- application dock ----
    html += '<div class="dock">';
    APPS.forEach((app, i) => {
      const on = sel.zone === 'dock' && sel.i === i;
      html +=
        `<div class="dock-icon dk-${app.tone}${on ? ' sel' : ''}" data-act="dock" data-i="${i}" ` +
        `title="${app.name}">${DOCK_SVG[app.id] ?? ''}</div>`;
    });
    html += '</div>';

    host.innerHTML = html;

    host.addEventListener('mousedown', (e) => {
      const node = e.target.closest('[data-act]');
      if (!node) return;
      sel = { zone: node.dataset.act, i: Number(node.dataset.i) };
      activate();
    });
  },

  onKey(ev) {
    const { id } = ev;

    // direct selection by letter / number, as on the handheld
    if (id === 'LA') { sel = { zone: 'scratch', i: 0 }; return activate(); }
    if (id === 'LB') { sel = { zone: 'scratch', i: 1 }; return activate(); }
    const digit = { d1: 0, d2: 1, d3: 2, d4: 3, d5: 4 }[id];
    if (digit !== undefined) { sel = { zone: 'docs', i: digit }; return activate(); }

    if (id === 'enter' || id === 'click') return activate();

    const lens = { scratch: SCRATCH_ITEMS.length, docs: DOC_ITEMS.length, dock: APPS.length };

    if (id === 'down') {
      if (sel.i + 1 < lens[sel.zone]) sel.i += 1;
      else sel = { zone: 'dock', i: 0 };
      refresh(); return true;
    }
    if (id === 'up') {
      if (sel.zone === 'dock') sel = { zone: 'scratch', i: SCRATCH_ITEMS.length - 1 };
      else if (sel.i > 0) sel.i -= 1;
      refresh(); return true;
    }
    if (id === 'right') {
      if (sel.zone === 'scratch') sel = { zone: 'docs', i: Math.min(sel.i, DOC_ITEMS.length - 1) };
      else if (sel.zone === 'dock') sel.i = Math.min(sel.i + 1, APPS.length - 1);
      refresh(); return true;
    }
    if (id === 'left') {
      if (sel.zone === 'docs') sel = { zone: 'scratch', i: Math.min(sel.i, SCRATCH_ITEMS.length - 1) };
      else if (sel.zone === 'dock') sel.i = Math.max(sel.i - 1, 0);
      refresh(); return true;
    }
    return false;
  },
};

function activate() {
  if (sel.zone === 'scratch') SCRATCH_ITEMS[sel.i].action?.();
  else if (sel.zone === 'dock') openApp(APPS[sel.i].id);
  else if (sel.zone === 'docs') DOC_ITEMS[sel.i].action?.();
  return true;
}

export function goHome() {
  setView(homeView);
}
