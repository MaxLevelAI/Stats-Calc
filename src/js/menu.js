// Application menu: the cascading popup the [menu] key opens.
//
// Appearance is taken from TI's own handheld screenshot (research/pdfimg/
// gs042_Im64.png): an off-white panel pinned to the top-left of the screen
// with a 1px black border, ~17px rows, "N: Label" text, a right-pointing
// triangle on submenu rows, and a solid cyan bar on the selected row.

import { setModal, clearModal, refresh } from './screen.js';

const ROW_H = 17;
const MIN_W = 96;
const TOP = 1;
const SCREEN_H = 240;
const SCREEN_W = 320;

// Icons for the Calculator's top level, matching TI's menu artwork.
const CUBE =
  '<svg viewBox="0 0 12 12"><g fill="none" stroke="currentColor" stroke-width="1">' +
  '<path d="M2 4l4-2 4 2v5l-4 2-4-2z"/><path d="M2 4l4 2 4-2M6 6v5"/></g></svg>';

const TOP_ICONS = {
  Actions: '⚡',
  Number: '½.5',
  Algebra: 'X=',
  Calculus: '∫d',
  Probability: CUBE,
  Statistics: 'x̄',
  'Matrix & Vector': '▦',
  Finance: '$€',
  'Functions & Programs': '010',
  Hints: '?',
};

function rowsThatFit(top) {
  return Math.max(3, Math.floor((SCREEN_H - top - 3) / ROW_H));
}

export function openMenu(items, onPick) {
  // one frame per open level: { items, i, scroll, x, y }
  const levels = [{ items, i: 0, scroll: 0, x: 1, y: TOP }];

  const top = () => levels[levels.length - 1];

  function ensureVisible(L) {
    const fit = rowsThatFit(L.y);
    if (L.i < L.scroll) L.scroll = L.i;
    if (L.i >= L.scroll + fit) L.scroll = L.i - fit + 1;
    L.scroll = Math.max(0, Math.min(L.scroll, Math.max(0, L.items.length - fit)));
  }

  function enter() {
    const L = top();
    const item = L.items[L.i];
    if (!item) return true;
    if (item.sub) {
      // Anchor to the parent row, but lift the panel so it shows as many rows
      // as the screen can hold instead of being squeezed against the bottom.
      const wanted = Math.min(item.sub.length, rowsThatFit(TOP));
      const highest = SCREEN_H - 3 - wanted * ROW_H;
      const anchored = L.y + (L.i - L.scroll) * ROW_H;
      const y = Math.max(TOP, Math.min(anchored, highest));

      levels.push({ items: item.sub, i: 0, scroll: 0, x: 0, y });
      refresh();
      return true;
    }
    clearModal();
    onPick(item);
    return true;
  }

  function back() {
    if (levels.length > 1) { levels.pop(); refresh(); return true; }
    clearModal();
    return true;
  }

  const modal = {
    id: 'menu',

    mount(host) {
      let html = '';
      levels.forEach((L, li) => {
        ensureVisible(L);
        const fit = rowsThatFit(L.y);
        const shown = L.items.slice(L.scroll, L.scroll + fit);
        const dim = li < levels.length - 1 ? ' dim' : '';
        html += `<div class="menu-panel${dim}" style="top:${L.y}px">`;
        if (L.scroll > 0) html += '<div class="menu-more">▴</div>';
        shown.forEach((item, n) => {
          const idx = L.scroll + n;
          const sel = idx === L.i && li === levels.length - 1;
          const ico = li === 0 ? `<span class="menu-ico">${TOP_ICONS[item.label] ?? ''}</span>` : '';
          html +=
            `<div class="menu-row${sel ? ' sel' : ''}${item.sep ? ' sep' : ''}" ` +
            `data-level="${li}" data-i="${idx}">` +
            ico +
            `<span class="menu-label">${item.k}: ${item.label}</span>` +
            (item.sub ? '<span class="menu-arrow">▶</span>' : '') +
            '</div>';
        });
        if (L.scroll + fit < L.items.length) html += '<div class="menu-more">▾</div>';
        html += '</div>';
      });
      host.innerHTML = html;

      // Panels size to their content, like TI's do, so lay them out after the
      // browser has measured them and cascade each one off the previous width.
      let x = 1;
      host.querySelectorAll('.menu-panel').forEach((p) => {
        const w = Math.max(p.offsetWidth, MIN_W);
        if (x + w > SCREEN_W - 1) x = SCREEN_W - 1 - w;
        p.style.left = `${Math.max(0, x)}px`;
        x = Math.max(0, x) + w - 6;
      });

      host.addEventListener('mousedown', (e) => {
        const row = e.target.closest('.menu-row');
        if (!row) return;
        const li = Number(row.dataset.level);
        while (levels.length - 1 > li) levels.pop();
        top().i = Number(row.dataset.i);
        enter();
      });
    },

    onKey(ev) {
      const L = top();
      const { id, def } = ev;

      if (id === 'down') { L.i = Math.min(L.i + 1, L.items.length - 1); refresh(); return true; }
      if (id === 'up') { L.i = Math.max(L.i - 1, 0); refresh(); return true; }
      if (id === 'right') return enter();
      if (id === 'enter' || id === 'click') return enter();
      if (id === 'left') return back();
      if (id === 'esc') return back();
      if (id === 'menu') { clearModal(); return true; }

      // jump straight to an item by its printed number or letter
      const ch = def?.letter ? def.letter : { d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7', d8: '8', d9: '9' }[id];
      if (ch) {
        const n = L.items.findIndex((it) => it.k.toUpperCase() === ch.toUpperCase());
        if (n >= 0) { L.i = n; return enter(); }
        return true;
      }
      return true;
    },
  };

  setModal(modal);
}
