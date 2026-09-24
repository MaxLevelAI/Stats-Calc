// Document-level user interface: the Documents menu, the Settings screen,
// the Page Sorter and My Documents.
//
// Menu numbering follows the paths the Getting Started guide quotes:
//   ~1 6  File > Send      ~4 1  Insert > Problem
//   ~5 5  Page Layout > Delete Application
//   ~5 7  Page Layout > Group      ~5 8  Page Layout > Ungroup
// so File is 1, Insert is 4 and Page Layout is 5. Edit, View and Settings
// fill 2, 3 and 6; their leaves are RECONSTRUCTED.

import { setModal, clearModal, pushView, popView, refresh } from './screen.js';
import { openMenu } from './menu.js';
import { settings } from './math/cas.js';
import * as D from './doc.js';

const A = (k, label, act) => ({ k, label, ins: `\u0000${act}` });
const S = (k, label, sub) => ({ k, label, sub });

export const DOC_MENU = [
  S('1', 'File', [
    A('1', 'New Document', 'file:new'),
    A('2', 'Open Document', 'file:open'),
    A('3', 'Save', 'file:save'),
    A('4', 'Save As...', 'file:saveAs'),
    A('5', 'Close', 'file:close'),
    A('6', 'Send', 'file:send'),
  ]),
  S('2', 'Edit', [ // RECONSTRUCTED
    A('1', 'Undo', 'edit:undo'),
    A('2', 'Redo', 'edit:redo'),
    A('3', 'Cut', 'edit:cut'),
    A('4', 'Copy', 'edit:copy'),
    A('5', 'Paste', 'edit:paste'),
    A('6', 'Delete', 'edit:delete'),
  ]),
  S('3', 'View', [ // RECONSTRUCTED
    A('1', 'Page Sorter', 'view:sorter'),
    A('2', 'Previous Page', 'view:prev'),
    A('3', 'Next Page', 'view:next'),
  ]),
  S('4', 'Insert', [
    A('1', 'Problem', 'insert:problem'),
    A('2', 'Page', 'insert:page'),
    A('3', 'Calculator', 'insert:app:calculator'),
    A('4', 'Graphs', 'insert:app:graphs'),
    A('5', 'Geometry', 'insert:app:geometry'),
    A('6', 'Lists & Spreadsheet', 'insert:app:lists'),
    A('7', 'Data & Statistics', 'insert:app:stats'),
    A('8', 'Notes', 'insert:app:notes'),
  ]),
  S('5', 'Page Layout', [ // only 5, 7 and 8 are verified
    A('1', 'Custom Split', 'layout:custom'),
    A('2', 'Select Layout', 'layout:select'),
    A('3', 'Swap Application', 'layout:swap'),
    A('4', 'Delete Page', 'layout:deletePage'),
    A('5', 'Delete Application', 'layout:deleteApp'),
    A('7', 'Group', 'layout:group'),
    A('8', 'Ungroup', 'layout:ungroup'),
  ]),
  A('6', 'Settings', 'settings:open'),
  { k: '7', label: 'Hints', ins: '\u0000hints', sep: true },
];

/* ============================== Settings ============================== */

const FIX = Array.from({ length: 13 }, (_, i) => ({ label: `Fix${i}`, value: { fix: i } }));
const FLOATN = Array.from({ length: 12 }, (_, i) => ({ label: `Float${i + 1}`, value: { float: i + 1 } }));

const FIELDS = [
  {
    key: 'digits', label: 'Display Digits',
    options: [{ label: 'Float', value: 'FLOAT' }, ...FLOATN, ...FIX],
    apply: (v) => { settings.digits = v; },
  },
  {
    key: 'angle', label: 'Angle',
    options: [{ label: 'Radian', value: 'RAD' }, { label: 'Degree', value: 'DEG' }, { label: 'Gradian', value: 'GRAD' }],
    apply: (v) => { settings.angle = v; },
  },
  {
    key: 'expo', label: 'Exponential Format',
    options: [{ label: 'Normal', value: 'NORMAL' }, { label: 'Scientific', value: 'SCI' }, { label: 'Engineering', value: 'ENG' }],
    apply: (v) => { settings.expo = v; },
  },
  {
    key: 'complex', label: 'Real or Complex',
    options: [{ label: 'Real', value: 'REAL' }, { label: 'Rectangular', value: 'RECT' }, { label: 'Polar', value: 'POLAR' }],
    pending: true,
  },
  {
    key: 'calc', label: 'Calculation Mode',
    options: [{ label: 'Auto', value: 'AUTO' }, { label: 'Exact', value: 'EXACT' }, { label: 'Approximate', value: 'APPROX' }],
    apply: (v) => { settings.calc = v; },
  },
  {
    key: 'cas', label: 'CAS Mode',
    options: [{ label: 'On', value: 'ON' }, { label: 'Exact Arithmetic', value: 'EA' }, { label: 'Off', value: 'OFF' }],
    pending: true,
  },
  {
    key: 'vector', label: 'Vector Format',
    options: [{ label: 'Rectangular', value: 'RECT' }, { label: 'Cylindrical', value: 'CYL' }, { label: 'Spherical', value: 'SPH' }],
    pending: true,
  },
  {
    key: 'base', label: 'Base',
    options: [{ label: 'Decimal', value: 'DEC' }, { label: 'Hex', value: 'HEX' }, { label: 'Binary', value: 'BIN' }],
    pending: true,
  },
];

// values for the settings this build does not act on yet
const extra = { complex: 'REAL', cas: 'ON', vector: 'RECT', base: 'DEC' };

const sameValue = (a, b) =>
  (typeof a === 'object' && typeof b === 'object' ? JSON.stringify(a) === JSON.stringify(b) : a === b);

function indexOfCurrent(f) {
  const cur = f.pending ? extra[f.key] : settings[f.key];
  const i = f.options.findIndex((o) => sameValue(o.value, cur));
  return i < 0 ? 0 : i;
}

export function openSettings() {
  const sel = FIELDS.map(indexOfCurrent);
  let focus = 0;

  pushView({
    id: 'settings',
    title: 'Document Settings',

    mount(host) {
      const rows = FIELDS.map((f, i) =>
        `<div class="st-row${i === focus ? ' sel' : ''}" data-i="${i}">` +
        `<span class="st-label">${f.label}</span>` +
        `<span class="st-value">◂ ${f.options[sel[i]].label} ▸</span>` +
        (f.pending ? '<span class="st-pending">stored</span>' : '') +
        '</div>').join('');
      host.innerHTML = `<div class="st-list">${rows}</div>` +
        '<div class="st-foot">◂ ▸ change · enter applies · esc cancels</div>';
      host.querySelector('.st-row.sel')?.scrollIntoView({ block: 'nearest' });

      host.addEventListener('mousedown', (e) => {
        const row = e.target.closest('[data-i]');
        if (!row) return;
        focus = Number(row.dataset.i);
        refresh();
      });
    },

    onKey(ev) {
      const { id } = ev;
      if (id === 'down') { focus = Math.min(focus + 1, FIELDS.length - 1); refresh(); return true; }
      if (id === 'up') { focus = Math.max(focus - 1, 0); refresh(); return true; }
      if (id === 'right' || id === 'left') {
        const f = FIELDS[focus];
        const n = f.options.length;
        sel[focus] = (sel[focus] + (id === 'right' ? 1 : n - 1)) % n;
        refresh();
        return true;
      }
      if (id === 'enter' || id === 'click') {
        FIELDS.forEach((f, i) => {
          const v = f.options[sel[i]].value;
          if (f.pending) extra[f.key] = v; else f.apply(v);
        });
        popView();
        return true;
      }
      return false;
    },
  });
}

/* ============================== Page Sorter ============================== */

export function openPageSorter() {
  const list = D.allPages();
  let sel = Math.max(0, list.findIndex((e) => e.p === D.doc.p && e.pg === D.doc.pg));

  pushView({
    id: 'sorter',
    title: 'Page Sorter',

    mount(host) {
      let html = '<div class="ps-grid">';
      list.forEach((e, i) => {
        const pg = D.doc.problems[e.p].pages[e.pg];
        html +=
          `<div class="ps-card${i === sel ? ' sel' : ''}" data-i="${i}">` +
          `<div class="ps-thumb">${pg.view.title ?? ''}</div>` +
          `<div class="ps-tab">${e.p + 1}.${e.pg + 1}</div></div>`;
      });
      html += '</div>';
      host.innerHTML = html;
      host.addEventListener('mousedown', (ev) => {
        const card = ev.target.closest('[data-i]');
        if (!card) return;
        const e = list[Number(card.dataset.i)];
        popView();
        D.goTo(e.p, e.pg);
      });
    },

    onKey(ev) {
      const { id } = ev;
      if (id === 'right' || id === 'down') { sel = Math.min(sel + 1, list.length - 1); refresh(); return true; }
      if (id === 'left' || id === 'up') { sel = Math.max(sel - 1, 0); refresh(); return true; }
      if (id === 'enter' || id === 'click') {
        const e = list[sel];
        popView();
        D.goTo(e.p, e.pg);
        return true;
      }
      return false;
    },
  });
}

/* ============================== My Documents ============================== */

export function openMyDocuments() {
  const names = Object.keys(D.listSaved()).sort();
  let sel = 0;

  pushView({
    id: 'mydocs',
    title: 'My Documents',

    mount(host) {
      const rows = names.length
        ? names.map((n, i) =>
          `<div class="md-row${i === sel ? ' sel' : ''}" data-i="${i}">` +
          `<span class="md-icon"></span><span>${esc(n)}</span></div>`).join('')
        : '<div class="md-empty">No saved documents yet</div>';
      host.innerHTML = `<div class="md-list">${rows}</div>` +
        '<div class="st-foot">enter opens · del removes · esc goes back</div>';

      host.addEventListener('mousedown', (e) => {
        const row = e.target.closest('[data-i]');
        if (!row) return;
        sel = Number(row.dataset.i);
        popView();
        D.openDocument(names[sel]);
      });
    },

    onKey(ev) {
      const { id } = ev;
      if (!names.length) return false;
      if (id === 'down') { sel = Math.min(sel + 1, names.length - 1); refresh(); return true; }
      if (id === 'up') { sel = Math.max(sel - 1, 0); refresh(); return true; }
      if (id === 'del') { D.deleteDocument(names[sel]); names.splice(sel, 1); sel = Math.max(0, sel - 1); refresh(); return true; }
      if (id === 'enter' || id === 'click') { popView(); D.openDocument(names[sel]); return true; }
      return false;
    },
  });
}

/* ============================== name prompt ============================== */

export function promptName(title, initial, onDone) {
  let text = initial;
  setModal({
    id: 'prompt',
    mount(host) {
      host.innerHTML =
        '<div class="wz-panel">' +
        `<div class="wz-title">${esc(title)}</div>` +
        `<div class="wz-body"><div class="wz-row"><span class="wz-label">Name</span>` +
        `<span class="wz-field sel">${esc(text)}</span></div></div>` +
        '<div class="wz-buttons"><span class="wz-btn sel">OK</span></div></div>';
    },
    onKey(ev) {
      const { id, def, shift } = ev;
      if (id === 'esc') { clearModal(); return true; }
      if (id === 'enter' || id === 'click') { clearModal(); onDone(text.trim()); return true; }
      if (id === 'del') { text = text.slice(0, -1); refresh(); return true; }
      const LIT = { d0: '0', d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7', d8: '8', d9: '9', space: ' ', minus: '-', dot: '.' };
      let ch = LIT[id];
      if (!ch && def?.letter) ch = shift ? def.letter : def.letter.toLowerCase();
      if (ch) { text += ch; refresh(); return true; }
      return true;
    },
  });
}

/* ============================== menu dispatch ============================== */

export function handleDocMenu(item, setNote) {
  const ins = item.ins ?? '';
  if (!ins.startsWith('\u0000')) return;
  const parts = ins.slice(1).split(':');
  const [verb, arg, arg2] = parts;

  if (verb === 'file') {
    if (arg === 'new') D.newDocument();
    else if (arg === 'open') openMyDocuments();
    else if (arg === 'save' || arg === 'saveAs') {
      const start = arg === 'save' && D.doc.name !== 'Unsaved' ? D.doc.name : '';
      if (arg === 'save' && start) D.saveDocument(start);
      else promptName('Save As', start, (name) => { if (name) D.saveDocument(name); });
    } else if (arg === 'close') D.newDocument();
    else setNote?.(`"${item.label}" is not built yet`);
    return;
  }
  if (verb === 'view') {
    if (arg === 'sorter') openPageSorter();
    else if (arg === 'prev') D.step(-1);
    else if (arg === 'next') D.step(1);
    return;
  }
  if (verb === 'insert') {
    if (arg === 'problem') D.addProblem();
    else if (arg === 'page') D.addPage();
    else if (arg === 'app') D.addPage(arg2);
    return;
  }
  if (verb === 'layout') {
    if (arg === 'deletePage' || arg === 'deleteApp') D.deletePage();
    else setNote?.(`"${item.label}" is not built yet`);
    return;
  }
  if (verb === 'settings') { openSettings(); return; }
  setNote?.(`"${item.label}" is not built yet`);
}

export function openDocMenu(setNote) {
  openMenu(DOC_MENU, (item) => handleDocMenu(item, setNote));
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
