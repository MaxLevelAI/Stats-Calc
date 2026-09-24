// Graphs.
//
// Layout follows TI's screenshot (research/pdfimg/gm170_img310.png): an entry
// line across the top showing f1(x)= with a show/hide box, and the plotting
// area below with axes through the origin and end values on the axis ends.
//
// The entry line is the same two-dimensional editor the Calculator uses, so a
// fraction or a radical types the same way here.

import { refresh, setModal, clearModal } from '../screen.js';
import { openMenu } from '../menu.js';
import { openTemplates } from '../templates.js';
import { compileFunction, compileDerivative } from '../math/engine.js';
import { niceTicks, scale, tickLabel, svgEl } from '../plot.js';
import { GRAPHS_MENU } from './graphs-menu.js';
import * as M from '../mathedit.js';

const ENTRY_H = 24;
const W = 320;
const H = 214;            // work area below the title bar
const PLOT_T = ENTRY_H;
const PLOT_B = H;

const COLORS = ['#1f6fe0', '#cf2a2a', '#1f9d42', '#8a3fd1', '#d98b1f', '#20a9b5'];

const STANDARD = { x0: -10, x1: 10, y0: -6.67, y1: 6.67 };

export function makeGraphsView() {
  // each function: { expr: row, fn: compiled|null, err, shown }
  const funcs = [{ expr: M.row(), fn: null, err: '', shown: true }];
  let active = 0;                     // index being edited
  let cur = { row: funcs[0].expr, i: 0 };
  let win = { ...STANDARD };
  let grid = 'none';
  let showAxes = true;
  let entryHidden = false;
  let trace = null;                   // { i, x }
  let marks = [];                     // { x, y, label }
  let note = '';

  const sx = () => scale(win.x0, win.x1, 0, W);
  const sy = () => scale(win.y0, win.y1, PLOT_B, PLOT_T);

  /* ---------------- compiling ---------------- */

  function compile(i) {
    const f = funcs[i];
    const src = M.linearize(f.expr).trim();
    f.err = '';
    f.fn = null;
    if (!src) return;
    try {
      f.fn = compileFunction(src, 'x');
      // a quick probe catches undefined names before the first redraw
      const probe = f.fn(1);
      if (Number.isNaN(probe) && !/[a-wyz]/i.test(src)) f.err = 'Undefined';
    } catch (e) {
      f.err = e.message;
    }
  }

  function commit() {
    compile(active);
    const f = funcs[active];
    if (M.linearize(f.expr).trim() && active === funcs.length - 1) {
      funcs.push({ expr: M.row(), fn: null, err: '', shown: true });
    }
  }

  function selectFunc(i) {
    active = Math.max(0, Math.min(funcs.length - 1, i));
    cur = { row: funcs[active].expr, i: funcs[active].expr.items.length };
  }

  /* ---------------- analysis ---------------- */

  const plotted = () => funcs.map((f, i) => ({ ...f, i })).filter((f) => f.fn && f.shown);

  function samples(fn, n = 400) {
    const out = [];
    for (let k = 0; k <= n; k += 1) {
      const x = win.x0 + ((win.x1 - win.x0) * k) / n;
      out.push([x, fn(x)]);
    }
    return out;
  }

  function findZero(fn) {
    const s = samples(fn);
    for (let k = 1; k < s.length; k += 1) {
      const [xa, ya] = s[k - 1];
      const [xb, yb] = s[k];
      if (!Number.isFinite(ya) || !Number.isFinite(yb)) continue;
      if (ya === 0) return xa;
      if (ya * yb < 0) {
        let a = xa;
        let b = xb;
        for (let it = 0; it < 80; it += 1) {
          const m = (a + b) / 2;
          if (fn(a) * fn(m) <= 0) b = m; else a = m;
        }
        return (a + b) / 2;
      }
    }
    return null;
  }

  function findExtremum(fn, wantMin) {
    const s = samples(fn).filter(([, y]) => Number.isFinite(y));
    let best = null;
    for (let k = 1; k < s.length - 1; k += 1) {
      const [, ya] = s[k - 1];
      const [xb, yb] = s[k];
      const [, yc] = s[k + 1];
      const isExt = wantMin ? yb <= ya && yb <= yc : yb >= ya && yb >= yc;
      if (!isExt) continue;
      // golden-section refine in the neighbouring interval
      let lo = s[k - 1][0];
      let hi = s[k + 1][0];
      const g = (Math.sqrt(5) - 1) / 2;
      for (let it = 0; it < 90; it += 1) {
        const c = hi - g * (hi - lo);
        const d = lo + g * (hi - lo);
        const better = wantMin ? fn(c) < fn(d) : fn(c) > fn(d);
        if (better) hi = d; else lo = c;
      }
      const x = (lo + hi) / 2;
      const y = fn(x);
      if (!best || (wantMin ? y < best[1] : y > best[1])) best = [x, y];
      if (best && Math.abs(xb) >= 0) { /* keep scanning for a better one */ }
    }
    return best;
  }

  function findIntersection() {
    const ps = plotted();
    if (ps.length < 2) { note = 'Need two graphs'; return null; }
    const [a, b] = ps;
    const diff = (x) => a.fn(x) - b.fn(x);
    const x = findZero(diff);
    return x === null ? null : [x, a.fn(x)];
  }

  function simpson(fn, a, b, n = 400) {
    const h = (b - a) / n;
    let s = fn(a) + fn(b);
    for (let k = 1; k < n; k += 1) s += fn(a + k * h) * (k % 2 ? 4 : 2);
    return (s * h) / 3;
  }

  function runAnalysis(what) {
    const ps = plotted();
    if (!ps.length) { note = 'Graph a function first'; return; }
    const target = ps.find((p) => p.i === active) ?? ps[0];
    const fn = target.fn;
    const label = (x, y, name) => marks.push({ x, y, label: `${name}: (${sig(x)}, ${sig(y)})` });

    if (what === 'zero') {
      const x = findZero(fn);
      if (x === null) { note = 'No zero in this window'; return; }
      label(x, 0, 'zero');
    } else if (what === 'min' || what === 'max') {
      const r = findExtremum(fn, what === 'min');
      if (!r) { note = `No ${what === 'min' ? 'minimum' : 'maximum'} in this window`; return; }
      label(r[0], r[1], what === 'min' ? 'minimum' : 'maximum');
    } else if (what === 'intersect') {
      const r = findIntersection();
      if (!r) { note = note || 'No intersection in this window'; return; }
      label(r[0], r[1], 'intersection');
    } else if (what === 'dydx') {
      const src = M.linearize(target.expr);
      const x = trace ? trace.x : (win.x0 + win.x1) / 2;
      try {
        const d = compileDerivative(src, 'x');
        marks.push({ x, y: fn(x), label: `dy/dx: ${sig(d(x))}` });
      } catch (e) {
        note = e.message;
      }
    } else if (what === 'integral') {
      const v = simpson(fn, win.x0, win.x1);
      marks.push({ x: (win.x0 + win.x1) / 2, y: 0, label: `∫ = ${sig(v)}` });
    } else if (what === 'inflection') {
      const d2 = (x) => (fn(x + 1e-3) - 2 * fn(x) + fn(x - 1e-3)) / 1e-6;
      const x = findZero(d2);
      if (x === null) { note = 'No inflection point in this window'; return; }
      label(x, fn(x), 'inflection');
    } else {
      note = 'Not built yet';
    }
  }

  /* ---------------- zoom ---------------- */

  function zoom(what) {
    const cx = (win.x0 + win.x1) / 2;
    const cy = (win.y0 + win.y1) / 2;
    const wx = win.x1 - win.x0;
    const wy = win.y1 - win.y0;
    const set = (a, b, c, d) => { win = { x0: a, x1: b, y0: c, y1: d }; };

    if (what === 'standard') set(STANDARD.x0, STANDARD.x1, STANDARD.y0, STANDARD.y1);
    else if (what === 'in') set(cx - wx / 4, cx + wx / 4, cy - wy / 4, cy + wy / 4);
    else if (what === 'out') set(cx - wx, cx + wx, cy - wy, cy + wy);
    else if (what === 'quadrant1') set(-1, 16, -1, 11);
    else if (what === 'trig') set(-2 * Math.PI, 2 * Math.PI, -4, 4);
    else if (what === 'square') {
      const aspect = (PLOT_B - PLOT_T) / W;
      const half = (wx / 2) * aspect;
      set(win.x0, win.x1, cy - half, cy + half);
    } else if (what === 'fit' || what === 'data') {
      const ps = plotted();
      if (!ps.length) { note = 'Nothing to fit'; return; }
      let lo = Infinity;
      let hi = -Infinity;
      for (const p of ps) {
        for (const [, y] of samples(p.fn, 200)) {
          if (!Number.isFinite(y)) continue;
          lo = Math.min(lo, y);
          hi = Math.max(hi, y);
        }
      }
      if (!Number.isFinite(lo)) { note = 'Nothing to fit'; return; }
      const pad = (hi - lo) * 0.1 || 1;
      set(win.x0, win.x1, lo - pad, hi + pad);
    } else {
      note = 'Not built yet';
    }
  }

  /* ---------------- menu ---------------- */

  function onMenuPick(item) {
    const ins = item.ins ?? '';
    if (!ins.startsWith('\u0000')) return;
    const [verb, arg] = ins.slice(1).split(':');
    marks = marks.slice(-3);

    switch (verb) {
      case 'zoom': zoom(arg); break;
      case 'an': runAnalysis(arg); break;
      case 'grid': grid = arg; break;
      case 'trace':
        if (arg === 'on') trace = trace ? null : { x: (win.x0 + win.x1) / 2 };
        else note = 'Not built yet';
        break;
      case 'view':
        if (arg === 'axes') showAxes = !showAxes;
        else if (arg === 'entryline') entryHidden = !entryHidden;
        else note = 'Not built yet';
        break;
      case 'entry':
        if (arg === 'function') selectFunc(funcs.length - 1);
        else note = `"${item.label}" is not built yet`;
        break;
      case 'act':
        if (arg === 'deleteAll') {
          funcs.length = 0;
          funcs.push({ expr: M.row(), fn: null, err: '', shown: true });
          selectFunc(0);
          marks = [];
        } else note = `"${item.label}" is not built yet`;
        break;
      default:
        note = `"${item.label}" is not built yet`;
    }
    refresh();
  }

  /* ---------------- rendering ---------------- */

  function curvePath(fn, X, Y) {
    let d = '';
    let pen = false;
    const N = 320;
    for (let k = 0; k <= N; k += 1) {
      const x = win.x0 + ((win.x1 - win.x0) * k) / N;
      const y = fn(x);
      if (!Number.isFinite(y) || y > win.y1 + (win.y1 - win.y0) * 4 || y < win.y0 - (win.y1 - win.y0) * 4) {
        pen = false;
        continue;
      }
      const px = X(x);
      const py = Y(y);
      d += `${pen ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)} `;
      pen = true;
    }
    return d.trim();
  }

  function renderAxes(X, Y) {
    let g = '';
    const xt = niceTicks(win.x0, win.x1, 8);
    const yt = niceTicks(win.y0, win.y1, 6);

    if (grid !== 'none') {
      for (const v of xt.ticks) g += svgEl('line', { x1: X(v), y1: PLOT_T, x2: X(v), y2: PLOT_B, class: `gr-grid gr-${grid}` });
      for (const v of yt.ticks) g += svgEl('line', { x1: 0, y1: Y(v), x2: W, y2: Y(v), class: `gr-grid gr-${grid}` });
    }
    if (!showAxes) return g;

    const y0 = Math.max(PLOT_T, Math.min(PLOT_B, Y(0)));
    const x0 = Math.max(0, Math.min(W, X(0)));

    g += svgEl('line', { x1: 0, y1: y0, x2: W, y2: y0, class: 'gr-axis' });
    g += svgEl('line', { x1: x0, y1: PLOT_T, x2: x0, y2: PLOT_B, class: 'gr-axis' });

    for (const v of xt.ticks) {
      if (v === 0) continue;
      g += svgEl('line', { x1: X(v), y1: y0 - 2, x2: X(v), y2: y0 + 2, class: 'gr-axis' });
    }
    for (const v of yt.ticks) {
      if (v === 0) continue;
      g += svgEl('line', { x1: x0 - 2, y1: Y(v), x2: x0 + 2, y2: Y(v), class: 'gr-axis' });
    }

    // End values print the window bounds themselves, not a rounded tick, so
    // the default -6.67 does not show up as -7.
    // end values sit on the far side of each axis from its name, so the two
    // never overlap at the corners
    g += svgEl('text', { x: 3, y: y0 + 9, class: 'gr-end' }, endLabel(win.x0));
    g += svgEl('text', { x: W - 3, y: y0 + 9, class: 'gr-end right' }, endLabel(win.x1));
    g += svgEl('text', { x: x0 + 4, y: PLOT_T + 9, class: 'gr-end' }, endLabel(win.y1));
    g += svgEl('text', { x: x0 + 4, y: PLOT_B - 3, class: 'gr-end' }, endLabel(win.y0));
    g += svgEl('text', { x: W - 4, y: y0 - 4, class: 'gr-axname right' }, 'x');
    g += svgEl('text', { x: x0 - 4, y: PLOT_T + 9, class: 'gr-axname right' }, 'y');
    return g;
  }

  return {
    id: 'graphs',
    title: 'Graphs',

    serialize: () => ({
      funcs: funcs.map((f) => ({ src: M.linearize(f.expr), shown: f.shown })),
      win: { ...win }, grid, showAxes,
    }),
    restore(state) {
      if (!state) return;
      funcs.length = 0;
      (state.funcs ?? []).forEach((f) => {
        funcs.push({ expr: M.rowOf(f.src ?? ''), fn: null, err: '', shown: f.shown !== false });
      });
      if (!funcs.length) funcs.push({ expr: M.row(), fn: null, err: '', shown: true });
      funcs.forEach((_, i) => compile(i));
      win = state.win ? { ...state.win } : { ...STANDARD };
      grid = state.grid ?? 'none';
      showAxes = state.showAxes !== false;
      selectFunc(0);
    },

    onKey(ev) {
      const { id, def, ctrl, shift } = ev;
      note = '';

      if (id === 'menu') { openMenu(GRAPHS_MENU, onMenuPick); return true; }
      if (id === 'templ') { openTemplates((node) => { cur = M.insertNode(cur, node); refresh(); }); return true; }

      if (trace) {
        const step = (win.x1 - win.x0) / 80;
        if (id === 'right') { trace.x += step; refresh(); return true; }
        if (id === 'left') { trace.x -= step; refresh(); return true; }
        if (id === 'esc') { trace = null; refresh(); return true; }
      }

      if (id === 'enter') { commit(); selectFunc(active + 1); refresh(); return true; }
      if (id === 'tab') { commit(); selectFunc(active + 1); refresh(); return true; }

      if (id === 'up') {
        const moved = M.moveVertical(funcs[active].expr, cur, -1);
        if (moved) cur = moved; else selectFunc(active - 1);
        refresh(); return true;
      }
      if (id === 'down') {
        const moved = M.moveVertical(funcs[active].expr, cur, 1);
        if (moved) cur = moved; else selectFunc(active + 1);
        refresh(); return true;
      }
      if (id === 'left') { cur = M.moveLeft(funcs[active].expr, cur) ?? cur; refresh(); return true; }
      if (id === 'right') { cur = M.moveRight(funcs[active].expr, cur) ?? cur; refresh(); return true; }

      if (id === 'del') {
        if (ctrl) { funcs[active].expr = M.row(); cur = { row: funcs[active].expr, i: 0 }; }
        else cur = M.backspace(funcs[active].expr, cur);
        compile(active);
        refresh();
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
        lparen: '(', rparen: ')', space: ' ', pi: 'π', neg: '−', equals: '=',
      };

      if (ctrl && CTRL_TEMPLATE[id]) { cur = M.insertNode(cur, CTRL_TEMPLATE[id]()); compile(active); refresh(); return true; }
      if (TEMPLATE[id]) { cur = M.insertNode(cur, TEMPLATE[id]()); compile(active); refresh(); return true; }
      if (LITERAL[id] !== undefined) { cur = M.insertText(cur, LITERAL[id]); compile(active); refresh(); return true; }
      if (def && def.letter) {
        cur = M.insertText(cur, shift ? def.letter : def.letter.toLowerCase());
        compile(active);
        refresh();
        return true;
      }
      return false;
    },

    mount(host) {
      const X = sx();
      const Y = sy();

      let g = renderAxes(X, Y);
      for (const p of plotted()) {
        g += svgEl('path', { d: curvePath(p.fn, X, Y), class: 'gr-curve', style: `stroke:${COLORS[p.i % COLORS.length]}` });
      }

      if (trace) {
        const p = plotted().find((q) => q.i === active) ?? plotted()[0];
        if (p) {
          const y = p.fn(trace.x);
          if (Number.isFinite(y)) {
            g += svgEl('line', { x1: X(trace.x), y1: PLOT_T, x2: X(trace.x), y2: PLOT_B, class: 'gr-tracebar' });
            g += svgEl('circle', { cx: X(trace.x), cy: Y(y), r: 3, class: 'gr-tracept' });
            g += svgEl('text', {
              x: Math.min(X(trace.x) + 5, W - 88), y: Math.max(Y(y) - 5, PLOT_T + 10), class: 'gr-label',
            }, `(${sig(trace.x)}, ${sig(y)})`);
          }
        }
      }

      for (const mk of marks) {
        g += svgEl('circle', { cx: X(mk.x), cy: Y(mk.y), r: 3, class: 'gr-mark' });
        g += svgEl('text', {
          x: Math.min(X(mk.x) + 5, W - 96), y: Math.max(Y(mk.y) - 5, PLOT_T + 10), class: 'gr-label',
        }, mk.label);
      }

      const f = funcs[active];
      const entry = entryHidden ? '' :
        '<div class="gr-entry">' +
        `<span class="gr-check${f.shown ? ' on' : ''}"></span>` +
        `<span class="gr-fname" style="color:${COLORS[active % COLORS.length]}">f${active + 1}(x)=</span>` +
        `<span class="gr-expr">${M.render(f.expr, cur)}</span>` +
        `<span class="gr-hist">☰</span></div>`;

      host.innerHTML =
        entry +
        `<svg class="gr-svg" viewBox="0 0 ${W} ${H}" style="top:${entryHidden ? 0 : 0}px">` +
        `<rect x="0" y="${PLOT_T}" width="${W}" height="${PLOT_B - PLOT_T}" class="gr-bg"/>` +
        g +
        '</svg>' +
        (f.err ? `<div class="gr-err">${esc(f.err)}</div>` : '') +
        (note ? `<div class="gr-note">${esc(note)}</div>` : '');
    },
  };
}

/** Six significant digits, with numerical dust snapped to a round value. */
const sig = (v) => {
  if (!Number.isFinite(v)) return String(v);
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-7) return String(r);
  return String(Number(v.toPrecision(6)));
};

/** Axis end values: enough precision to be honest, no trailing noise. */
const endLabel = (v) => {
  if (!Number.isFinite(v)) return '';
  const s = Number(v.toFixed(2));
  return String(s);
};

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
