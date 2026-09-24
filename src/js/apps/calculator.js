// Calculator application: scrolling history above, a two-dimensional entry
// line at the bottom, and the full application menu on the [menu] key.

import { refresh } from '../screen.js';
import { openMenu } from '../menu.js';
import { openWizard } from '../wizard.js';
import { openTemplates } from '../templates.js';
import { openCatalog, openVarList, openSymbolPalette } from '../palettes.js';
import { evaluate } from '../math/engine.js';
import { CALC_MENU } from './calc-menu.js';
import * as M from '../mathedit.js';

// Characters a key types straight into the entry line.
const LITERAL = {
  d0: '0', d1: '1', d2: '2', d3: '3', d4: '4',
  d5: '5', d6: '6', d7: '7', d8: '8', d9: '9',
  dot: '.', comma: ',', plus: '+', minus: '-', mul: '·', div: '/',
  lparen: '(', rparen: ')', equals: '=', space: ' ',
  pi: 'π', EE: 'E', neg: '−',
};

// Keys that drop in a template instead of text.
const KEY_TEMPLATE = {
  caret: () => ({ t: 'sup', exp: M.row() }),
  sq: () => ({ t: 'sup', exp: M.rowOf('2') }),
  ex: () => ({ t: 'expE', exp: M.row() }),
  tenx: () => M.row([...'10'].map(M.ch).concat({ t: 'sup', exp: M.row() })),
};

// ctrl-shifted second functions printed above the keys.
const CTRL_TEMPLATE = {
  sq: () => ({ t: 'sqrt', rad: M.row() }),
  caret: () => ({ t: 'nthroot', idx: M.row(), rad: M.row() }),
  tenx: () => ({ t: 'log', base: M.row(), arg: M.row() }),
  div: () => ({ t: 'frac', num: M.row(), den: M.row() }),
};

const CTRL_TEXT = { ex: 'ln(', lparen: '[', rparen: '{', neg: 'ans' };

export function makeCalculatorView(opts = {}) {
  const history = []; // { input, output, error }
  let entry = M.row();
  let cur = { row: entry, i: 0 };
  let note = '';
  let recall = -1;   // index into history while arrowing back through it

  const menuTree = opts.menu ?? CALC_MENU;

  function reset() {
    entry = M.row();
    cur = { row: entry, i: 0 };
    recall = -1;
  }

  /** Pull an earlier entry back onto the entry line, as the handheld does. */
  function recallEntry(dir) {
    if (!history.length) return false;
    const next = recall < 0 ? (dir < 0 ? history.length - 1 : -1) : recall + (dir < 0 ? -1 : 1);
    if (next < 0 || next >= history.length) { recall = -1; entry = M.row(); cur = { row: entry, i: 0 }; return true; }
    recall = next;
    entry = M.cloneRow(history[recall].tree);
    cur = { row: entry, i: entry.items.length };
    return true;
  }

  function insertNode(node) {
    cur = M.insertNode(cur, node);
  }

  function insertText(text) {
    cur = M.insertText(cur, text);
  }

  function submit(approx) {
    const src = M.linearize(entry).trim();
    if (!src) return;
    let out;
    let err = false;
    try {
      out = evaluate(approx ? `approx(${src})` : src);
    } catch (e) {
      out = e && e.message ? e.message : 'Error';
      err = true;
    }
    history.push({ input: M.render(entry, null), output: out, error: err, tree: M.cloneRow(entry) });
    reset();
  }

  function onMenuPick(item) {
    if (item.wizard) {
      openWizard(item.wizard, (cmd) => {
        reset();
        insertText(cmd);
        submit(false);
        refresh();
      });
      return;
    }
    const ins = item.ins ?? '';
    if (ins.startsWith('\u0000')) {
      const action = ins.slice(1);
      if (action === 'clearHistory') { history.length = 0; note = ''; }
      else note = `"${item.label}" is not built yet`;
      refresh();
      return;
    }
    // the caret marker in a menu insertion just means "leave the cursor here"
    const at = ins.indexOf('|');
    if (at >= 0) {
      insertText(ins.slice(0, at) + ins.slice(at + 1));
      for (let k = ins.length - 1 - at; k > 0; k -= 1) {
        const back = M.moveLeft(entry, cur);
        if (back) cur = back;
      }
    } else {
      insertText(ins);
    }
    refresh();
  }

  return {
    id: 'calculator',
    title: 'Calculator',

    serialize: () => ({ history: history.map((h) => ({ input: h.input, output: h.output, error: h.error })) }),
    restore(state) {
      history.length = 0;
      (state?.history ?? []).forEach((h) => history.push(h));
    },

    mount(host) {
      const rows = history
        .map(
          (h) =>
            '<div class="calc-row">' +
            `<div class="calc-in">${h.input}</div>` +
            `<div class="calc-out${h.error ? ' err' : ''}">${esc(h.output)}</div>` +
            '</div>'
        )
        .join('');

      host.innerHTML =
        `<div class="calc-hist">${rows}${note ? `<div class="calc-note">${esc(note)}</div>` : ''}</div>` +
        `<div class="calc-entry">${M.render(entry, cur)}</div>`;

      const h = host.querySelector('.calc-hist');
      h.scrollTop = h.scrollHeight;
    },

    onKey(ev) {
      const { id, def, ctrl, shift } = ev;
      note = '';

      if (id === 'menu') { openMenu(menuTree, onMenuPick); return true; }
      if (id === 'templ') { openTemplates((node) => { insertNode(node); refresh(); }); return true; }
      if (id === 'cat') {
        if (ctrl) openSymbolPalette('symbols', (t) => { insertText(t); refresh(); });
        else openCatalog((t) => { insertText(t); refresh(); });
        return true;
      }
      if (id === 'var') {
        if (ctrl) { insertText('→'); refresh(); return true; }   // sto
        openVarList((n) => { insertText(n); refresh(); });
        return true;
      }
      if (id === 'trig') { openSymbolPalette('trig', (t) => { insertText(t); refresh(); }); return true; }
      if (id === 'pi' && !ctrl) { openSymbolPalette('pi', (t) => { insertText(t); refresh(); }); return true; }
      if (id === 'punct') { openSymbolPalette('punct', (t) => { insertText(t); refresh(); }); return true; }
      if (ctrl && id === 'equals') { openSymbolPalette('relational', (t) => { insertText(t); refresh(); }); return true; }

      if (id === 'enter') { submit(ctrl); refresh(); return true; }

      if (id === 'del') {
        if (ctrl) reset();
        else cur = M.backspace(entry, cur);
        refresh();
        return true;
      }

      if (id === 'left') { cur = M.moveLeft(entry, cur) ?? cur; refresh(); return true; }
      if (id === 'right') { cur = M.moveRight(entry, cur) ?? cur; refresh(); return true; }
      if (id === 'up' || id === 'down') {
        const moved = M.moveVertical(entry, cur, id === 'up' ? -1 : 1);
        if (moved) { cur = moved; refresh(); return true; }
        if (recallEntry(id === 'up' ? -1 : 1)) refresh();
        return true;
      }

      if (ctrl && CTRL_TEMPLATE[id]) { insertNode(CTRL_TEMPLATE[id]()); refresh(); return true; }
      if (ctrl && CTRL_TEXT[id]) { insertText(CTRL_TEXT[id]); refresh(); return true; }
      if (KEY_TEMPLATE[id]) {
        const node = KEY_TEMPLATE[id]();
        if (node.t === 'row') { node.items.forEach((it) => { cur = M.insertNode(cur, it); }); }
        else insertNode(node);
        refresh();
        return true;
      }
      if (LITERAL[id] !== undefined) { insertText(LITERAL[id]); refresh(); return true; }
      if (id === 'sto') { insertText('→'); refresh(); return true; }

      if (def && def.letter) {
        insertText(shift ? def.letter : def.letter.toLowerCase());
        refresh();
        return true;
      }
      return false;
    },
  };
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
