// Notes.
//
// Free text with live math boxes inside it. A math box holds the same
// two-dimensional expression tree the Calculator uses, and pressing enter in
// one evaluates it and shows "= result" beside the expression.
//
// Templates (Default, Q&A, Proof) split the page into labelled sections that
// tab moves between, matching the guidebook's description.

import { refresh } from '../screen.js';
import { openMenu } from '../menu.js';
import { openTemplates } from '../templates.js';
import { openWizard } from '../wizard.js';
import { evaluate } from '../math/engine.js';
import { NOTES_MENU } from './notes-menu.js';
import * as M from '../mathedit.js';

const TEMPLATES = {
  default: { sections: [''] },
  qa: { sections: ['Question', 'Answer'] },
  proof: { sections: ['Statements', 'Reasons'] },
};

export function makeNotesView() {
  let template = 'default';
  let sections = [M.row()];
  let active = 0;                       // section index
  let cur = { row: sections[0], i: 0 };
  let hideAnswer = false;
  let note = '';

  function setTemplate(name) {
    const spec = TEMPLATES[name];
    if (!spec) return;
    const keep = sections;
    template = name;
    sections = spec.sections.map((_, i) => keep[i] ?? M.row());
    active = 0;
    cur = { row: sections[0], i: sections[0].items.length };
  }

  /* ---------------- math boxes ---------------- */

  const newMathBox = () => ({ t: 'mathbox', expr: M.row(), result: null, showResult: true, active: true });

  /** The math box the cursor currently sits inside, if any. */
  function boxAtCursor() {
    for (const sec of sections) {
      const found = findBox(sec, cur.row);
      if (found) return found;
    }
    return null;
  }

  function findBox(node, targetRow) {
    if (node.t === 'row') {
      for (const it of node.items) {
        const hit = findBox(it, targetRow);
        if (hit) return hit;
      }
      return null;
    }
    if (node.t === 'mathbox') {
      if (containsRow(node.expr, targetRow)) return node;
      return null;
    }
    const def = M.NODES[node.t];
    if (def) {
      for (const s of def.slots) {
        const hit = findBox(node[s], targetRow);
        if (hit) return hit;
      }
    }
    if (M.isGrid(node)) {
      for (const c of node.cells) {
        const hit = findBox(c, targetRow);
        if (hit) return hit;
      }
    }
    return null;
  }

  function containsRow(node, target) {
    if (node === target) return true;
    if (node.t === 'row') return node.items.some((it) => containsRow(it, target));
    if (M.isGrid(node)) return node.cells.some((c) => containsRow(c, target));
    const def = M.NODES[node.t];
    return def ? def.slots.some((s) => containsRow(node[s], target)) : false;
  }

  function evaluateBox(box) {
    const src = M.linearize(box.expr).trim();
    if (!src) { box.result = null; return; }
    if (box.active === false) { box.result = null; return; }
    try {
      box.result = evaluate(src);
      box.error = false;
    } catch (e) {
      box.result = e.message;
      box.error = true;
    }
  }

  function evaluateAll() {
    for (const sec of sections) walkBoxes(sec, evaluateBox);
  }

  function walkBoxes(node, fn) {
    if (node.t === 'row') { node.items.forEach((it) => walkBoxes(it, fn)); return; }
    if (node.t === 'mathbox') { fn(node); walkBoxes(node.expr, fn); return; }
    if (M.isGrid(node)) { node.cells.forEach((c) => walkBoxes(c, fn)); return; }
    const def = M.NODES[node.t];
    if (def) def.slots.forEach((s) => walkBoxes(node[s], fn));
  }

  /* ---------------- menu ---------------- */

  function onMenuPick(item) {
    if (item.wizard) {
      openWizard(item.wizard, (cmd) => {
        const box = boxAtCursor() ?? insertBox();
        box.expr = M.rowOf(cmd);
        evaluateBox(box);
        refresh();
      });
      return;
    }

    const ins = item.ins ?? '';
    if (ins.startsWith('\u0000')) {
      const [verb, arg] = ins.slice(1).split(':');
      if (verb === 'tpl') {
        if (arg === 'hideAnswer') hideAnswer = !hideAnswer;
        else setTemplate(arg);
      } else if (verb === 'ins' && arg === 'mathbox') insertBox();
      else if (verb === 'mb') {
        const box = boxAtCursor();
        if (arg === 'deactivateAll' || arg === 'activateAll') {
          const on = arg === 'activateAll';
          sections.forEach((s) => walkBoxes(s, (b) => { b.active = on; if (!on) b.result = null; }));
          if (on) evaluateAll();
        } else if (!box) note = 'Put the cursor in a math box first';
        else if (arg === 'toggleOutput') box.showResult = !box.showResult;
        else if (arg === 'deactivate') { box.active = false; box.result = null; }
        else note = `"${item.label}" is not built yet`;
      } else if (verb === 'act' && arg === 'clear') {
        sections = sections.map(() => M.row());
        cur = { row: sections[active], i: 0 };
      } else {
        note = `"${item.label}" is not built yet`;
      }
      refresh();
      return;
    }

    // a Calculator menu entry: drop it into a math box
    const box = boxAtCursor() ?? insertBox();
    const at = ins.indexOf('|');
    const text = at >= 0 ? ins.slice(0, at) + ins.slice(at + 1) : ins;
    cur = M.insertText(cur, text);
    if (at >= 0) {
      for (let k = ins.length - 1 - at; k > 0; k -= 1) {
        const back = M.moveLeft(box.expr, cur);
        if (back) cur = back;
      }
    }
    refresh();
  }

  function insertBox() {
    const box = newMathBox();
    cur = M.insertNode(cur, box);
    return box;
  }

  /* ---------------- rendering ---------------- */

  /** Notes renders its own text so newlines wrap; math boxes delegate. */
  function renderSection(sec) {
    let html = '';
    let run = '';
    const flush = () => { if (run) { html += esc(run).replace(/\n/g, '<br>'); run = ''; } };

    sec.items.forEach((it, i) => {
      if (cur.row === sec && cur.i === i) { flush(); html += '<span class="m-caret"></span>'; }
      if (it.t === 'ch') { run += it.c; return; }
      flush();
      html += M.render(M.row([it]), cur);
    });
    flush();
    if (cur.row === sec && cur.i === sec.items.length) html += '<span class="m-caret"></span>';
    return html || '<span class="nt-empty"></span>';
  }

  return {
    id: 'notes',
    title: 'Notes',

    serialize: () => ({ template, hideAnswer, sections: sections.map((s) => M.linearize(s)) }),
    restore(state) {
      if (!state) return;
      setTemplate(state.template ?? 'default');
      (state.sections ?? []).forEach((text, i) => { if (sections[i]) sections[i] = M.rowOf(text); });
      active = 0;
      cur = { row: sections[0], i: sections[0].items.length };
      hideAnswer = !!state.hideAnswer;
    },

    onKey(ev) {
      const { id, def, ctrl, shift } = ev;
      note = '';
      const box = boxAtCursor();

      if (id === 'menu') { openMenu(NOTES_MENU, onMenuPick); return true; }
      if (id === 'templ') { openTemplates((n) => { cur = M.insertNode(cur, n); refresh(); }); return true; }

      // ctrl-M inserts a math box, as printed in TI's shortcut table
      if (ctrl && id === 'LM') { insertBox(); refresh(); return true; }

      if (id === 'tab') {
        active = (active + 1) % sections.length;
        cur = { row: sections[active], i: sections[active].items.length };
        refresh();
        return true;
      }

      if (id === 'enter') {
        if (box) { evaluateBox(box); cur = exitBox(box); }
        else cur = M.insertText(cur, '\n');
        refresh();
        return true;
      }

      if (id === 'del') {
        cur = M.backspace(sections[active], cur);
        if (box) evaluateBox(box);
        refresh();
        return true;
      }

      if (id === 'left') { cur = M.moveLeft(sections[active], cur) ?? cur; refresh(); return true; }
      if (id === 'right') { cur = M.moveRight(sections[active], cur) ?? cur; refresh(); return true; }
      if (id === 'up' || id === 'down') {
        const moved = M.moveVertical(sections[active], cur, id === 'up' ? -1 : 1);
        if (moved) { cur = moved; refresh(); return true; }
        return true;
      }

      const TEMPLATE = {
        caret: () => ({ t: 'sup', exp: M.row() }),
        sq: () => ({ t: 'sup', exp: M.rowOf('2') }),
        ex: () => ({ t: 'expE', exp: M.row() }),
      };
      const CTRL_TEMPLATE = {
        sq: () => ({ t: 'sqrt', rad: M.row() }),
        div: () => ({ t: 'frac', num: M.row(), den: M.row() }),
      };
      const LITERAL = {
        d0: '0', d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7', d8: '8', d9: '9',
        dot: '.', comma: ',', plus: '+', minus: '-', mul: '·', div: '/',
        lparen: '(', rparen: ')', equals: '=', space: ' ', pi: 'π', neg: '−',
        lbracket: '[', rbracket: ']', lbrace: '{', rbrace: '}',
      };

      if (ctrl && CTRL_TEMPLATE[id]) { cur = M.insertNode(cur, CTRL_TEMPLATE[id]()); refresh(); return true; }
      if (TEMPLATE[id] && box) { cur = M.insertNode(cur, TEMPLATE[id]()); refresh(); return true; }
      if (LITERAL[id] !== undefined) { cur = M.insertText(cur, LITERAL[id]); refresh(); return true; }
      if (def && def.letter) {
        cur = M.insertText(cur, shift ? def.letter : def.letter.toLowerCase());
        refresh();
        return true;
      }
      return false;
    },

    mount(host) {
      const labels = TEMPLATES[template].sections;
      let html = '<div class="nt-page">';

      sections.forEach((sec, i) => {
        const hidden = template === 'qa' && i === 1 && hideAnswer;
        html += `<div class="nt-section${i === active ? ' active' : ''}">`;
        if (labels[i]) html += `<div class="nt-label">${labels[i]}</div>`;
        html += `<div class="nt-body">${hidden ? '<span class="nt-hidden">(answer hidden)</span>' : renderSection(sec)}</div>`;
        html += '</div>';
      });
      html += '</div>';

      if (note) html += `<div class="nt-note">${esc(note)}</div>`;
      host.innerHTML = html;

      const body = host.querySelector('.nt-section.active .nt-body');
      if (body) body.scrollTop = body.scrollHeight;
    },
  };

  /** After evaluating, park the cursor just after the box. */
  function exitBox(box) {
    const sec = sections[active];
    const idx = sec.items.indexOf(box);
    if (idx >= 0) return { row: sec, i: idx + 1 };
    return cur;
  }
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
