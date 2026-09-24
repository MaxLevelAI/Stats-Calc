// Data & Statistics.
//
// Opens as an empty case plot with "Click to add variable" on both axes, the
// way the handheld does. Assigning an X variable gives a dot plot; adding a Y
// variable switches to a scatter plot. Plot Type, Analyze (regressions and
// residuals), Window/Zoom and Graph Trace all work off the same data.

import { refresh, setModal, clearModal } from '../screen.js';
import { openMenu } from '../menu.js';
import { vars } from '../math/engine.js';
import * as MST from '../math/stats.js';
import { invNorm } from '../math/dist.js';
import {
  niceTicks, padRange, scale, tickLabel,
  boxParts, histogram, dotStacks, normalScores, svgEl,
} from '../plot.js';
import { STATS_MENU } from './stats-menu.js';

// plot frame inside the 320 x 214 work area
const L = 26;
const R = 314;
const T = 6;
const B = 182;

const NUMERIC_TYPES = ['dot', 'box', 'hist', 'normprob'];
const XY_TYPES = ['scatter', 'xyline'];
const CAT_TYPES = ['dotchart', 'bar', 'pie'];

const TYPE_NAME = {
  dot: 'Dot Plot', box: 'Box Plot', hist: 'Histogram', normprob: 'Normal Probability Plot',
  scatter: 'Scatter Plot', xyline: 'X-Y Line Plot',
  dotchart: 'Dot Chart', bar: 'Bar Chart', pie: 'Pie Chart',
};

/** Every list variable currently defined, as [name, values]. */
function listVariables() {
  const out = [];
  for (const [name, node] of vars) {
    if (name.startsWith('stat.')) continue;
    if (!node || node.k !== 'list' || !node.items.length) continue;
    out.push([name, node.items.map(valueOf)]);
  }
  return out;
}

function valueOf(node) {
  if (!node) return NaN;
  if (node.k === 'float') return node.x;
  if (node.k === 'num') return node.r.toNumber();
  if (node.k === 'text') return node.s;
  if (node.k === 'sym') return node.name;
  return NaN;
}

const numbersOnly = (vals) => vals.filter((v) => typeof v === 'number' && Number.isFinite(v));
const isNumericList = (vals) => vals.length > 0 && vals.every((v) => typeof v === 'number' && Number.isFinite(v));

export function makeDataStatsView() {
  let xVar = null;
  let yVar = null;
  let type = null;            // null until an X variable is chosen
  let showOutliers = true;
  let binCount = 0;           // 0 = automatic
  let regression = null;      // { kind, rows, f }
  let residualPlot = false;
  let trace = -1;             // index into the plotted points
  let win = null;             // { x0, x1, y0, y1 } or null for automatic
  let note = '';

  /* ---------------- data ---------------- */

  const xData = () => (xVar ? (listVariables().find(([n]) => n === xVar)?.[1] ?? []) : []);
  const yData = () => (yVar ? (listVariables().find(([n]) => n === yVar)?.[1] ?? []) : []);

  function defaultType() {
    if (!xVar) return null;
    if (yVar) return 'scatter';
    return isNumericList(xData()) ? 'dot' : 'bar';
  }

  function pairs() {
    const xs = xData();
    const ys = yData();
    const n = Math.min(xs.length, ys.length);
    const out = [];
    for (let i = 0; i < n; i += 1) {
      if (typeof xs[i] === 'number' && typeof ys[i] === 'number') out.push([xs[i], ys[i]]);
    }
    return out;
  }

  /* ---------------- variable picker ---------------- */

  function pickVariable(axis) {
    const listed = listVariables();
    if (!listed.length) {
      note = 'No list variables yet — name a column in Lists & Spreadsheet';
      refresh();
      return;
    }
    let sel = 0;
    setModal({
      id: 'varpick',
      mount(host) {
        const rows = listed
          .map(([name, vals], i) =>
            `<div class="menu-row${i === sel ? ' sel' : ''}" data-i="${i}">` +
            `<span class="menu-label">${name} (${vals.length})</span></div>`)
          .join('');
        host.innerHTML =
          `<div class="menu-panel" style="left:40px;top:30px">` +
          `<div class="vp-head">Add ${axis.toUpperCase()} Variable</div>${rows}</div>`;
        host.addEventListener('mousedown', (e) => {
          const row = e.target.closest('[data-i]');
          if (!row) return;
          sel = Number(row.dataset.i);
          choose();
        });
      },
      onKey(ev) {
        if (ev.id === 'down') { sel = Math.min(sel + 1, listed.length - 1); refresh(); return true; }
        if (ev.id === 'up') { sel = Math.max(sel - 1, 0); refresh(); return true; }
        if (ev.id === 'enter' || ev.id === 'click') return choose();
        if (ev.id === 'esc') { clearModal(); return true; }
        return true;
      },
    });

    function choose() {
      const [name] = listed[sel];
      clearModal();
      if (axis === 'x') xVar = name; else yVar = name;
      regression = null;
      residualPlot = false;
      trace = -1;
      win = null;
      type = defaultType();
      refresh();
      return true;
    }
  }

  /* ---------------- menu actions ---------------- */

  function onMenuPick(item) {
    const ins = item.ins ?? '';
    if (!ins.startsWith('\u0000')) return;
    const [verb, arg] = ins.slice(1).split(':');

    switch (verb) {
      case 'type':
        if (XY_TYPES.includes(arg) && !yVar) { note = 'Add a Y variable first'; break; }
        if (NUMERIC_TYPES.includes(arg) && !isNumericList(xData())) { note = 'X variable is not numeric'; break; }
        type = arg;
        win = null;
        trace = -1;
        if (!XY_TYPES.includes(type)) { regression = null; residualPlot = false; }
        break;
      case 'pick': pickVariable(arg); return;
      case 'remove':
        if (arg === 'x') { xVar = null; type = null; } else { yVar = null; type = defaultType(); }
        regression = null;
        win = null;
        break;
      case 'toggle':
        if (arg === 'outliers') showOutliers = !showOutliers;
        if (arg === 'categorical') type = CAT_TYPES.includes(type) ? 'dot' : 'bar';
        break;
      case 'hist': binCount = binCount ? 0 : Math.max(1, Math.round(Math.sqrt(numbersOnly(xData()).length))); break;
      case 'reg': runRegression(arg); break;
      case 'resid':
        if (!regression) { note = 'Show a regression first'; break; }
        residualPlot = arg === 'plot' ? !residualPlot : residualPlot;
        break;
      case 'zoom': doZoom(arg); break;
      case 'analyze':
        if (arg === 'trace') trace = trace < 0 ? 0 : -1;
        else if (arg === 'removePlot') { regression = null; residualPlot = false; }
        else note = `"${item.label}" is not built yet`;
        break;
      case 'clear':
        xVar = null; yVar = null; type = null; regression = null; residualPlot = false; win = null;
        break;
      default:
        note = `"${item.label}" is not built yet`;
    }
    refresh();
  }

  function runRegression(kind) {
    const pts = pairs();
    if (pts.length < 2) { note = 'Need an X and Y variable'; return; }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    try {
      let rows;
      let f;
      if (kind === 'LinRegMx' || kind === 'LinRegBx') {
        rows = kind === 'LinRegMx' ? MST.linRegMx(xs, ys) : MST.linRegBx(xs, ys);
        const a = pick(rows, kind === 'LinRegMx' ? 'stat.b' : 'stat.a');
        const b = pick(rows, kind === 'LinRegMx' ? 'stat.m' : 'stat.b');
        f = (v) => a + b * v;
      } else if (kind === 'MedMed') {
        rows = MST.medMed(xs, ys);
        const m = pick(rows, 'stat.m');
        const b = pick(rows, 'stat.b');
        f = (v) => m * v + b;
      } else if (kind === 'QuadReg' || kind === 'CubicReg' || kind === 'QuartReg') {
        const deg = { QuadReg: 2, CubicReg: 3, QuartReg: 4 }[kind];
        const labels = ['a', 'b', 'c', 'd', 'e'].slice(0, deg + 1);
        rows = MST.polyReg(xs, ys, deg, labels);
        const c = MST.polyFit(xs, ys, deg);
        f = (v) => c.reduce((s, k, i) => s + k * v ** i, 0);
      } else {
        rows = MST.transformedReg(kind, xs, ys);
        const a = pick(rows, 'stat.a');
        const b = pick(rows, 'stat.b');
        f = kind === 'ExpReg' ? (v) => a * b ** v
          : kind === 'PowerReg' ? (v) => a * v ** b
            : (v) => a + b * Math.log(v);
      }
      regression = { kind, rows, f, eqn: String(pick(rows, 'stat.RegEqn') ?? '') };
      note = '';
    } catch (e) {
      note = e.message;
    }
  }

  const pick = (rows, key) => rows.find(([n]) => n === key)?.[1];

  function doZoom(what) {
    const b = bounds();
    if (what === 'data') { win = null; return; }
    if (what === 'settings') { note = 'Window Settings is not built yet'; return; }
    const f = what === 'in' ? 0.75 : 1 / 0.75;
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    win = {
      x0: cx - ((b.x1 - b.x0) / 2) * f, x1: cx + ((b.x1 - b.x0) / 2) * f,
      y0: cy - ((b.y1 - b.y0) / 2) * f, y1: cy + ((b.y1 - b.y0) / 2) * f,
    };
  }

  /* ---------------- geometry ---------------- */

  function bounds() {
    if (win) return win;
    const xs = numbersOnly(xData());

    if (type === 'scatter' || type === 'xyline') {
      const pts = pairs();
      const [x0, x1] = padRange(Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0])));
      const ys = residualPlot && regression
        ? pts.map((p) => p[1] - regression.f(p[0]))
        : pts.map((p) => p[1]);
      const [y0, y1] = padRange(Math.min(...ys), Math.max(...ys));
      return { x0, x1, y0, y1 };
    }

    if (type === 'hist') {
      const h = histogram(xs, binCount);
      const [x0, x1] = padRange(h.min, h.max, 0.05);
      return { x0, x1, y0: 0, y1: Math.max(...h.bins.map((b) => b.count)) * 1.15 || 1 };
    }

    if (type === 'normprob') {
      const pts = normalScores(xs, invNorm);
      const [x0, x1] = padRange(Math.min(...xs), Math.max(...xs));
      const [y0, y1] = padRange(Math.min(...pts.map((p) => p.z)), Math.max(...pts.map((p) => p.z)));
      return { x0, x1, y0, y1 };
    }

    const [x0, x1] = padRange(Math.min(...xs), Math.max(...xs));
    return { x0, x1, y0: 0, y1: 1 };
  }

  /* ---------------- rendering ---------------- */

  function renderPlot() {
    const b = bounds();
    const sx = scale(b.x0, b.x1, L, R);
    const sy = scale(b.y0, b.y1, B, T);
    const xs = numbersOnly(xData());
    let g = '';

    const dot = (cx, cy, cls = 'pt') =>
      svgEl('circle', { cx, cy, r: 2.6, class: cls });

    if (type === 'dot') {
      const res = (b.x1 - b.x0) / 60;
      for (const { v, level } of dotStacks(xs, res)) {
        g += dot(sx(v), B - 4 - (level - 1) * 6);
      }
    }

    if (type === 'box') {
      const p = boxParts(xs, showOutliers);
      const midY = (T + B) / 2;
      const h = 26;
      g += svgEl('line', { x1: sx(p.lo), y1: midY, x2: sx(p.q1), y2: midY, class: 'ax' });
      g += svgEl('line', { x1: sx(p.q3), y1: midY, x2: sx(p.hi), y2: midY, class: 'ax' });
      g += svgEl('line', { x1: sx(p.lo), y1: midY - 6, x2: sx(p.lo), y2: midY + 6, class: 'ax' });
      g += svgEl('line', { x1: sx(p.hi), y1: midY - 6, x2: sx(p.hi), y2: midY + 6, class: 'ax' });
      g += svgEl('rect', {
        x: sx(p.q1), y: midY - h / 2, width: Math.max(1, sx(p.q3) - sx(p.q1)), height: h, class: 'box',
      });
      g += svgEl('line', { x1: sx(p.med), y1: midY - h / 2, x2: sx(p.med), y2: midY + h / 2, class: 'med' });
      for (const o of p.outliers) g += dot(sx(o), midY, 'out');
    }

    if (type === 'hist') {
      const h = histogram(xs, binCount);
      for (const bin of h.bins) {
        const x = sx(bin.lo);
        const w = Math.max(1, sx(bin.hi) - sx(bin.lo) - 1);
        g += svgEl('rect', { x, y: sy(bin.count), width: w, height: Math.max(0, B - sy(bin.count)), class: 'bar' });
      }
    }

    if (type === 'normprob') {
      for (const { v, z } of normalScores(xs, invNorm)) g += dot(sx(v), sy(z));
    }

    if (type === 'scatter' || type === 'xyline') {
      const pts = pairs();
      const shown = residualPlot && regression
        ? pts.map(([x, y]) => [x, y - regression.f(x)])
        : pts;
      if (residualPlot) g += svgEl('line', { x1: L, y1: sy(0), x2: R, y2: sy(0), class: 'zero' });
      if (type === 'xyline') {
        const d = shown
          .slice()
          .sort((p, q) => p[0] - q[0])
          .map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
          .join(' ');
        g += svgEl('path', { d, class: 'line' });
      }
      for (const [x, y] of shown) g += dot(sx(x), sy(y));

      if (regression && !residualPlot) {
        const steps = 60;
        let d = '';
        for (let i = 0; i <= steps; i += 1) {
          const xv = b.x0 + ((b.x1 - b.x0) * i) / steps;
          const yv = regression.f(xv);
          if (!Number.isFinite(yv)) continue;
          d += `${d ? 'L' : 'M'}${sx(xv).toFixed(1)},${sy(yv).toFixed(1)} `;
        }
        g += svgEl('path', { d: d.trim(), class: 'fit' });
      }

      if (trace >= 0 && shown.length) {
        const i = Math.min(trace, shown.length - 1);
        const [x, y] = shown[i];
        g += svgEl('circle', { cx: sx(x), cy: sy(y), r: 4, class: 'trace' });
        g += svgEl('text', {
          x: Math.min(sx(x) + 6, R - 80), y: Math.max(sy(y) - 5, T + 9), class: 'tracelbl',
        }, `(${short(x)}, ${short(y)})`);
      }
    }

    if (CAT_TYPES.includes(type)) g += renderCategorical(xData());

    return { g, b, sx, sy };
  }

  function renderCategorical(vals) {
    const counts = new Map();
    for (const v of vals) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    const cats = [...counts.entries()];
    const total = vals.length;
    let g = '';

    if (type === 'pie') {
      const cx = (L + R) / 2;
      const cy = (T + B) / 2;
      const rad = Math.min((R - L) / 2, (B - T) / 2) - 12;
      let angle = -Math.PI / 2;
      cats.forEach(([name, n], i) => {
        const span = (n / total) * Math.PI * 2;
        const x1 = cx + rad * Math.cos(angle);
        const y1 = cy + rad * Math.sin(angle);
        const x2 = cx + rad * Math.cos(angle + span);
        const y2 = cy + rad * Math.sin(angle + span);
        const large = span > Math.PI ? 1 : 0;
        g += svgEl('path', {
          d: `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${rad},${rad} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`,
          class: `slice s${i % 6}`,
        });
        const mid = angle + span / 2;
        g += svgEl('text', {
          x: cx + (rad + 8) * Math.cos(mid), y: cy + (rad + 8) * Math.sin(mid), class: 'catlbl',
        }, name);
        angle += span;
      });
      return g;
    }

    const slot = (R - L) / cats.length;
    const maxN = Math.max(...cats.map(([, n]) => n));
    cats.forEach(([name, n], i) => {
      const cx = L + slot * (i + 0.5);
      if (type === 'bar') {
        const h = ((B - T - 10) * n) / maxN;
        g += svgEl('rect', { x: cx - slot * 0.3, y: B - h, width: slot * 0.6, height: h, class: `bar s${i % 6}` });
      } else {
        for (let k = 0; k < n; k += 1) g += svgEl('circle', { cx, cy: B - 4 - k * 6, r: 2.6, class: 'pt' });
      }
      g += svgEl('text', { x: cx, y: B + 11, class: 'catlbl' }, name);
    });
    return g;
  }

  function renderAxes(b, sx, sy) {
    let g = svgEl('rect', { x: L, y: T, width: R - L, height: B - T, class: 'frame' });
    if (!type) return g;

    const showY = XY_TYPES.includes(type) || type === 'hist' || type === 'normprob';
    const xt = niceTicks(b.x0, b.x1, 6);
    if (!CAT_TYPES.includes(type)) {
      for (const v of xt.ticks) {
        const x = sx(v);
        if (x < L - 1 || x > R + 1) continue;
        g += svgEl('line', { x1: x, y1: B, x2: x, y2: B + 3, class: 'ax' });
        g += svgEl('text', { x, y: B + 12, class: 'ticklbl' }, tickLabel(v, xt.step));
      }
    }
    if (showY) {
      const yt = niceTicks(b.y0, b.y1, 4);
      for (const v of yt.ticks) {
        const y = sy(v);
        if (y < T - 1 || y > B + 1) continue;
        g += svgEl('line', { x1: L - 3, y1: y, x2: L, y2: y, class: 'ax' });
        g += svgEl('text', { x: L - 5, y: y + 3, class: 'ticklbl right' }, tickLabel(v, yt.step));
      }
    }
    return g;
  }

  /* ---------------- view ---------------- */

  return {
    id: 'stats',
    title: 'Data & Statistics',

    serialize: () => ({ xVar, yVar, type, showOutliers, binCount, win: win ? { ...win } : null }),
    restore(state) {
      if (!state) return;
      xVar = state.xVar ?? null;
      yVar = state.yVar ?? null;
      type = state.type ?? null;
      showOutliers = state.showOutliers !== false;
      binCount = state.binCount ?? 0;
      win = state.win ? { ...state.win } : null;
      regression = null;
      residualPlot = false;
      trace = -1;
    },

    onKey(ev) {
      const { id } = ev;
      note = '';
      if (id === 'menu') { openMenu(STATS_MENU, onMenuPick); return true; }
      if (id === 'tab') { pickVariable(xVar ? 'y' : 'x'); return true; }
      if (trace >= 0) {
        const n = pairs().length;
        if (id === 'right') { trace = Math.min(trace + 1, n - 1); refresh(); return true; }
        if (id === 'left') { trace = Math.max(trace - 1, 0); refresh(); return true; }
        if (id === 'esc') { trace = -1; refresh(); return true; }
      }
      if (id === 'plus') { doZoom('in'); refresh(); return true; }
      if (id === 'minus') { doZoom('out'); refresh(); return true; }
      return false;
    },

    mount(host) {
      let body = '';
      let b = null;
      let sx = null;
      let sy = null;

      let marks = '';
      if (type) {
        const out = renderPlot();
        b = out.b; sx = out.sx; sy = out.sy;
        body = renderAxes(b, sx, sy);
        marks = out.g;
      } else {
        body = svgEl('rect', { x: L, y: T, width: R - L, height: B - T, class: 'frame' });
      }

      const xLabel = xVar ?? 'Click to add variable';
      const yLabel = XY_TYPES.includes(type) || !type
        ? (yVar ?? (xVar ? 'Click to add variable' : ''))
        : '';
      const caption = regression && !residualPlot ? `y = ${regression.eqn}`
        : residualPlot ? 'Residual plot'
          : type ? TYPE_NAME[type] : '';

      host.innerHTML =
        `<svg class="ds-svg" viewBox="0 0 320 214">` +
        `<defs><clipPath id="dsclip">` +
        svgEl('rect', { x: L, y: T, width: R - L, height: B - T }) +
        '</clipPath></defs>' +
        body +
        `<g clip-path="url(#dsclip)">${marks}</g>` +
        (caption ? svgEl('text', { x: L + 4, y: T + 10, class: 'caption' }, esc(caption)) : '') +
        '</svg>' +
        `<div class="ds-xaxis${xVar ? '' : ' hint'}" data-axis="x">${esc(xLabel)}</div>` +
        (yLabel ? `<div class="ds-yaxis${yVar ? '' : ' hint'}" data-axis="y">${esc(yLabel)}</div>` : '') +
        (note ? `<div class="ds-note">${esc(note)}</div>` : '');

      host.addEventListener('mousedown', (e) => {
        const axis = e.target.closest('[data-axis]');
        if (axis) pickVariable(axis.dataset.axis);
      });
    },
  };
}

const short = (v) => String(Number(Number(v).toPrecision(6)));

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
