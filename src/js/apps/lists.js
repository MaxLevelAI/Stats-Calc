// Lists & Spreadsheet.
//
// Layout follows TI's handheld screenshot (research/pdfimg/gs042_Im64.png):
// a column-name row, a grey column-formula band, a double rule, then numbered
// data rows with a row gutter on the left and a reference box along the bottom.
//
// A named column becomes a real list variable, so once column A is called
// "height" you can type mean(height) in the Calculator.

import { refresh } from '../screen.js';
import { openMenu } from '../menu.js';
import { openWizard } from '../wizard.js';
import { evaluateValue, vars } from '../math/engine.js';
import { LISTS_MENU } from './lists-menu.js';

export const NAME_ROW = -2;
export const FORMULA_ROW = -1;

const COLS = 26;
const VISIBLE_COLS = 4;
const VISIBLE_ROWS = 7;

const colLetter = (i) => String.fromCharCode(65 + i);

export function makeListsView() {
  const cells = new Map();     // "A1" -> raw text
  const names = new Map();     // 0 -> "height"
  const formulas = new Map();  // 0 -> "=seq(n,n,1,10)"
  const computed = new Map();  // 0 -> array of display strings (from a formula)

  let cur = { col: 0, row: 0 };
  let top = { col: 0, row: 0 };
  let edit = null;   // { text } while typing
  let note = '';

  const ref = (c, r) => `${colLetter(c)}${r + 1}`;

  /* ---------------- evaluation ---------------- */

  function publishColumn(c) {
    const name = names.get(c);
    if (!name) return;
    const vals = [];
    for (let r = 0; r < 500; r += 1) {
      const v = rawAt(c, r);
      if (v === undefined || v === '') break;
      vals.push(v);
    }
    try {
      const node = evaluateValue(`{${vals.join(',')}}`);
      vars.set(name, node);
    } catch {
      /* a column that does not evaluate simply is not published */
    }
  }

  /** Recompute a column driven by a formula in its formula cell. */
  function runFormula(c) {
    const f = formulas.get(c);
    computed.delete(c);
    if (!f) return;
    const src = f.replace(/^=/, '').trim();
    if (!src) return;
    try {
      const node = evaluateValue(src);
      if (node.k === 'list') {
        computed.set(c, node.items.map((it) => renderCell(it)));
        note = '';
      } else {
        computed.set(c, [renderCell(node)]);
      }
    } catch (e) {
      note = e.message;
    }
  }

  function renderCell(node) {
    try {
      const v = node.k === 'float' ? node.x : node.r?.toNumber?.();
      if (typeof v === 'number' && Number.isFinite(v)) {
        return String(Number(v.toPrecision(10)));
      }
    } catch { /* fall through */ }
    return '';
  }

  /** Raw text for a data cell: the formula result wins over a typed value. */
  function rawAt(c, r) {
    const gen = computed.get(c);
    if (gen) return gen[r];
    return cells.get(ref(c, r));
  }

  function setCell(c, r, text) {
    if (r === NAME_ROW) {
      const clean = text.trim();
      if (clean) names.set(c, clean); else names.delete(c);
      publishColumn(c);
      return;
    }
    if (r === FORMULA_ROW) {
      if (text.trim()) formulas.set(c, text); else formulas.delete(c);
      runFormula(c);
      publishColumn(c);
      return;
    }
    if (computed.has(c)) { note = 'Column is defined by a formula'; return; }
    if (text === '') cells.delete(ref(c, r)); else cells.set(ref(c, r), text);
    publishColumn(c);
  }

  function displayAt(c, r) {
    if (r === NAME_ROW) return names.get(c) ?? '';
    if (r === FORMULA_ROW) return formulas.get(c) ?? '';
    const raw = rawAt(c, r);
    if (raw === undefined || raw === '') return '';
    if (computed.has(c)) return raw;
    try {
      const node = evaluateValue(raw);
      const shown = renderCell(node);
      return shown === '' ? raw : shown;
    } catch {
      return raw;
    }
  }

  /* ---------------- cursor ---------------- */

  function commit() {
    if (!edit) return;
    setCell(cur.col, cur.row, edit.text);
    edit = null;
  }

  function move(dc, dr) {
    commit();
    cur.col = Math.max(0, Math.min(COLS - 1, cur.col + dc));
    cur.row = Math.max(NAME_ROW, cur.row + dr);
    if (cur.col < top.col) top.col = cur.col;
    if (cur.col >= top.col + VISIBLE_COLS) top.col = cur.col - VISIBLE_COLS + 1;
    if (cur.row >= 0) {
      if (cur.row < top.row) top.row = cur.row;
      if (cur.row >= top.row + VISIBLE_ROWS) top.row = cur.row - VISIBLE_ROWS + 1;
    }
  }

  /* ---------------- menu ---------------- */

  function onMenuPick(item) {
    if (item.wizard) {
      openWizard(item.wizard, (cmd, title) => { runStat(cmd, title); refresh(); });
      return;
    }
    const ins = item.ins ?? '';
    if (ins.startsWith('\u0000')) {
      const action = ins.slice(1);
      if (action === 'clearData') { cells.clear(); formulas.clear(); computed.clear(); }
      else note = `"${item.label}" is not built yet`;
      refresh();
      return;
    }
    edit = { text: (edit?.text ?? '') + ins.replace('|', '') };
    refresh();
  }

  /**
   * Run a statistics command and write its results into two columns starting
   * at the cursor -- labels on the left, values on the right, with a Title row,
   * exactly as the handheld lays them out.
   */
  function runStat(cmd, title) {
    let node;
    try {
      node = evaluateValue(cmd);
    } catch (e) {
      note = e.message;
      return;
    }
    if (!node || node.k !== 'statresults') { note = 'No results'; return; }

    const labelCol = cur.col;
    const valueCol = cur.col + 1;
    const start = Math.max(cur.row, 0);

    // clear any formula that would fight with the written values
    [labelCol, valueCol].forEach((c) => { formulas.delete(c); computed.delete(c); });

    const rows = [['Title', title], ...node.rows.map(([n, v]) => [n.replace(/^stat\./, ''), v])];
    rows.forEach(([label, value], i) => {
      cells.set(ref(labelCol, start + i), String(label));
      cells.set(ref(valueCol, start + i),
        typeof value === 'string' ? value : renderCell(value) || textOf(value));
    });
    note = '';
  }

  function textOf(node) {
    if (!node) return '';
    if (node.k === 'text') return node.s;
    if (node.k === 'list') return `{${node.items.map((i) => renderCell(i)).join(',')}}`;
    return '';
  }

  /* ---------------- rendering ---------------- */

  return {
    id: 'lists',
    title: 'Lists & Spreadsheet',

    serialize: () => ({
      cells: [...cells.entries()],
      names: [...names.entries()],
      formulas: [...formulas.entries()],
    }),
    restore(state) {
      cells.clear(); names.clear(); formulas.clear(); computed.clear();
      (state?.cells ?? []).forEach(([k, v]) => cells.set(k, v));
      (state?.names ?? []).forEach(([k, v]) => names.set(Number(k), v));
      (state?.formulas ?? []).forEach(([k, v]) => formulas.set(Number(k), v));
      formulas.forEach((_, c) => runFormula(c));
      names.forEach((_, c) => publishColumn(c));
    },

    onKey(ev) {
      const { id, def, shift, ctrl } = ev;
      note = '';

      if (id === 'menu') { commit(); openMenu(LISTS_MENU, onMenuPick); return true; }

      if (id === 'up') { move(0, -1); refresh(); return true; }
      if (id === 'down') { move(0, 1); refresh(); return true; }
      if (id === 'left') {
        if (edit) { edit.text = edit.text.slice(0, -1); } else move(-1, 0);
        refresh(); return true;
      }
      if (id === 'right') { if (!edit) move(1, 0); refresh(); return true; }
      if (id === 'tab') { move(1, 0); refresh(); return true; }
      if (id === 'enter') { commit(); move(0, 1); refresh(); return true; }
      if (id === 'esc' && edit) { edit = null; refresh(); return true; }

      if (id === 'del') {
        if (ctrl) { setCell(cur.col, cur.row, ''); edit = null; }
        else if (edit) edit.text = edit.text.slice(0, -1);
        else setCell(cur.col, cur.row, '');
        refresh();
        return true;
      }

      const LITERAL = {
        d0: '0', d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7', d8: '8', d9: '9',
        dot: '.', comma: ',', plus: '+', minus: '-', mul: '*', div: '/', caret: '^',
        lparen: '(', rparen: ')', equals: '=', space: ' ',
      };
      let ch = LITERAL[id];
      if (!ch && def?.letter) ch = shift ? def.letter : def.letter.toLowerCase();
      if (ch) {
        if (!edit) edit = { text: '' };
        edit.text += ch;
        refresh();
        return true;
      }
      return false;
    },

    mount(host) {
      const GUT = 18;
      const CW = 70;
      let html = '<div class="ls-sheet">';

      // row gutter + column headers
      html += `<div class="ls-corner" style="width:${GUT}px"></div>`;
      for (let i = 0; i < VISIBLE_COLS; i += 1) {
        const c = top.col + i;
        const x = GUT + i * CW;
        const nameSel = cur.col === c && cur.row === NAME_ROW;
        const formSel = cur.col === c && cur.row === FORMULA_ROW;
        const nameText = nameSel && edit ? edit.text : (names.get(c) ?? '');
        const formText = formSel && edit ? edit.text : (formulas.get(c) ?? '');

        html +=
          `<div class="ls-name${nameSel ? ' sel' : ''}" style="left:${x}px;width:${CW}px">` +
          `<span class="ls-chip">${colLetter(c)}</span>` +
          `<span class="ls-nametext">${esc(nameText)}</span></div>`;
        html +=
          `<div class="ls-formula${formSel ? ' sel' : ''}" style="left:${x}px;width:${CW}px">` +
          `${esc(formText)}</div>`;
      }

      // data rows
      for (let j = 0; j < VISIBLE_ROWS; j += 1) {
        const r = top.row + j;
        html += `<div class="ls-rownum" style="top:${45 + j * 20}px;width:${GUT}px">${r + 1}</div>`;
        for (let i = 0; i < VISIBLE_COLS; i += 1) {
          const c = top.col + i;
          const sel = cur.col === c && cur.row === r;
          const text = sel && edit ? edit.text : displayAt(c, r);
          html +=
            `<div class="ls-cell${sel ? ' sel' : ''}${computed.has(c) ? ' gen' : ''}" ` +
            `style="left:${GUT + i * CW}px;top:${45 + j * 20}px;width:${CW}px" ` +
            `data-c="${c}" data-r="${r}">${esc(text)}</div>`;
        }
      }
      html += '</div>';

      // reference box along the bottom
      const label = cur.row === NAME_ROW
        ? `${colLetter(cur.col)} name`
        : cur.row === FORMULA_ROW
          ? `${colLetter(cur.col)} formula`
          : ref(cur.col, cur.row);
      html +=
        `<div class="ls-status"><span class="ls-ref">${label}</span>` +
        `<span class="ls-note">${esc(note)}</span></div>`;

      host.innerHTML = html;

      host.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('[data-c]');
        if (!cell) return;
        commit();
        cur = { col: Number(cell.dataset.c), row: Number(cell.dataset.r) };
        refresh();
      });
    },
  };
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
