// Geometry.
//
// A pointer you drive with the touchpad, the tool palette from the Geometry
// menu, and a dependency graph: derived objects (midpoints, intersections,
// reflections, measurements) recompute from their parents, so dragging a free
// point carries the whole construction with it.
//
// Lengths read in centimetres and angles in degrees, matching TI's defaults
// for the Geometry view (Geometry Angle defaults to Degree).

import { refresh } from '../screen.js';
import { openMenu } from '../menu.js';
import * as G from '../geom.js';
import { svgEl } from '../plot.js';
import { GEOMETRY_MENU } from './geometry-menu.js';

const W = 320;
const H = 214;
const RECT = { x0: 0, y0: 0, x1: W, y1: H };
const CM = 30;                 // screen pixels per centimetre
const HIT = 8;                 // pointer pick radius

// tool -> how many things it needs, and what it builds
const TOOLS = {
  pointer: { picks: 0 },
  delete: { picks: 1 },
  point: { picks: 1 },
  pointOn: { picks: 1, wants: 'object' },
  intersection: { picks: 2, wants: 'object' },
  segment: { picks: 2 }, line: { picks: 2 }, ray: { picks: 2 }, vector: { picks: 2 },
  circle: { picks: 2 },
  triangle: { picks: 3 }, rectangle: { picks: 2 },
  polygon: { picks: -1 }, regular: { picks: 2 },
  arc: { picks: 3 },
  tangent: { picks: 2, wants: 'mixed' },
  midpoint: { picks: 2 },
  parallel: { picks: 2, wants: 'mixed' },
  perpendicular: { picks: 2, wants: 'mixed' },
  perpBisector: { picks: 2 },
  angleBisector: { picks: 3 },
  symmetry: { picks: 2, wants: 'mixed' },
  reflection: { picks: 2, wants: 'mixed' },
  translation: { picks: 3, wants: 'mixed' },
  rotation: { picks: 2, wants: 'mixed' },
  dilation: { picks: 2, wants: 'mixed' },
  length: { picks: 2, wants: 'mixed' },
  area: { picks: 1, wants: 'object' },
  slopeM: { picks: 1, wants: 'object' },
  angle: { picks: 3 },
  dangle: { picks: 3 },
};

const TOOL_HINT = {
  point: 'Click to place a point',
  pointOn: 'Click an object',
  intersection: 'Click two objects',
  segment: 'Click two points', line: 'Click two points', ray: 'Click two points',
  vector: 'Click two points', circle: 'Centre, then a point on it',
  triangle: 'Click three points', rectangle: 'Click two opposite corners',
  polygon: 'Click points, then click the first again', regular: 'Centre, then a vertex',
  arc: 'Click three points',
  midpoint: 'Click two points', perpBisector: 'Click two points',
  parallel: 'Click a line, then a point', perpendicular: 'Click a line, then a point',
  angleBisector: 'Three points; the second is the vertex',
  symmetry: 'Click an object, then the centre',
  reflection: 'Click an object, then a line',
  translation: 'Object, then two points for the vector',
  rotation: 'Click an object, then the centre (90°)',
  dilation: 'Click an object, then the centre (×2)',
  length: 'Click two points, or one segment',
  area: 'Click a polygon or circle',
  slopeM: 'Click a line or segment',
  angle: 'Three points; the second is the vertex',
  dangle: 'Three points; the second is the vertex',
  delete: 'Click an object to delete it',
};

export function makeGeometryView() {
  const objs = [];               // { id, kind, ... }
  let nextId = 1;
  let nextLabel = 0;
  let tool = 'point';
  let picks = [];                // ids, or {x,y} for bare locations
  let ptr = { x: W / 2, y: H / 2 };
  let dragging = null;           // id of a free point being dragged
  let showLabels = true;
  let grid = 'none';
  let note = '';

  const byId = (id) => objs.find((o) => o.id === id);
  const add = (o) => { const obj = { id: nextId++, ...o }; objs.push(obj); return obj; };
  const labelFor = () => {
    const i = nextLabel++;
    return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
  };

  /* ---------------- resolving geometry from the dependency graph ---------------- */

  /** Coordinates of a point-like object. */
  function P(o) {
    if (!o) return null;
    if (o.kind !== 'point') return null;
    switch (o.role) {
      case 'free': return G.pt(o.x, o.y);
      case 'mid': {
        const [a, b] = o.parents.map((id) => P(byId(id)));
        return a && b ? G.mid(a, b) : null;
      }
      case 'on': {
        const host = byId(o.parents[0]);
        return pointOnObject(host, o.t);
      }
      case 'intersect': {
        const hits = intersectionsOf(byId(o.parents[0]), byId(o.parents[1]));
        return hits[o.which] ?? null;
      }
      case 'reflect': {
        const p = P(byId(o.parents[0]));
        const ln = lineOf(byId(o.parents[1]));
        return p && ln ? G.reflectPoint(p, ln[0], ln[1]) : null;
      }
      case 'symmetry': {
        const [p, c] = o.parents.map((id) => P(byId(id)));
        return p && c ? G.symmetryPoint(p, c) : null;
      }
      case 'rotate': {
        const [p, c] = o.parents.map((id) => P(byId(id)));
        return p && c ? G.rotatePoint(p, c, o.deg) : null;
      }
      case 'dilate': {
        const [p, c] = o.parents.map((id) => P(byId(id)));
        return p && c ? G.dilatePoint(p, c, o.k) : null;
      }
      case 'translate': {
        const [p, a, b] = o.parents.map((id) => P(byId(id)));
        return p && a && b ? G.translatePoint(p, G.sub(b, a)) : null;
      }
      default: return null;
    }
  }

  /** Two points defining the line of a linear object, or null. */
  function lineOf(o) {
    if (!o) return null;
    if (['segment', 'line', 'ray', 'vector'].includes(o.kind)) {
      const [a, b] = o.parents.map((id) => P(byId(id)));
      return a && b ? [a, b] : null;
    }
    if (o.kind === 'parallel' || o.kind === 'perpendicular') {
      const ref = lineOf(byId(o.parents[0]));
      const through = P(byId(o.parents[1]));
      if (!ref || !through) return null;
      const d = G.sub(ref[1], ref[0]);
      const dir = o.kind === 'parallel' ? d : G.pt(-d.y, d.x);
      return [through, G.add(through, dir)];
    }
    if (o.kind === 'perpBisector') {
      const [a, b] = o.parents.map((id) => P(byId(id)));
      if (!a || !b) return null;
      const m = G.mid(a, b);
      const d = G.sub(b, a);
      return [m, G.add(m, G.pt(-d.y, d.x))];
    }
    if (o.kind === 'angleBisector') {
      const [a, v, b] = o.parents.map((id) => P(byId(id)));
      if (!a || !v || !b) return null;
      return [v, G.add(v, G.angleBisectorDir(a, v, b))];
    }
    if (o.kind === 'tangent') {
      const circle = byId(o.parents[0]);
      const p = P(byId(o.parents[1]));
      const c = circleOf(circle);
      if (!c || !p) return null;
      const d = G.sub(p, c.centre);
      return [p, G.add(p, G.pt(-d.y, d.x))];
    }
    return null;
  }

  function circleOf(o) {
    if (!o || o.kind !== 'circle') return null;
    const [c, through] = o.parents.map((id) => P(byId(id)));
    if (!c || !through) return null;
    return { centre: c, r: G.dist(c, through) };
  }

  function polyPoints(o) {
    if (!o || !['polygon', 'triangle', 'rectangle'].includes(o.kind)) return null;
    if (o.kind === 'rectangle') {
      const [a, b] = o.parents.map((id) => P(byId(id)));
      if (!a || !b) return null;
      return [a, G.pt(b.x, a.y), b, G.pt(a.x, b.y)];
    }
    const ps = o.parents.map((id) => P(byId(id)));
    return ps.every(Boolean) ? ps : null;
  }

  function pointOnObject(host, t) {
    if (!host) return null;
    const ln = lineOf(host);
    if (ln) return G.add(ln[0], G.mul(G.sub(ln[1], ln[0]), t));
    const c = circleOf(host);
    if (c) return G.pt(c.centre.x + c.r * Math.cos(t * 2 * Math.PI), c.centre.y + c.r * Math.sin(t * 2 * Math.PI));
    const poly = polyPoints(host);
    if (poly) {
      const seg = Math.floor(t * poly.length) % poly.length;
      const local = t * poly.length - seg;
      return G.add(poly[seg], G.mul(G.sub(poly[(seg + 1) % poly.length], poly[seg]), local));
    }
    return null;
  }

  function intersectionsOf(a, b) {
    const la = lineOf(a);
    const lb = lineOf(b);
    const ca = circleOf(a);
    const cb = circleOf(b);
    if (la && lb) { const p = G.intersectLines(la[0], la[1], lb[0], lb[1]); return p ? [p] : []; }
    if (la && cb) return G.intersectLineCircle(la[0], la[1], cb.centre, cb.r);
    if (ca && lb) return G.intersectLineCircle(lb[0], lb[1], ca.centre, ca.r);
    if (ca && cb) return G.intersectCircles(ca.centre, ca.r, cb.centre, cb.r);
    return [];
  }

  /* ---------------- measurement ---------------- */

  function measureValue(o) {
    const ps = o.parents.map((id) => byId(id));
    if (o.what === 'length') {
      if (ps.length === 1) {
        const ln = lineOf(ps[0]);
        const poly = polyPoints(ps[0]);
        const c = circleOf(ps[0]);
        if (poly) return `${fmt(G.polygonPerimeter(poly) / CM)} cm`;
        if (c) return `${fmt((2 * Math.PI * c.r) / CM)} cm`;
        if (ln) return `${fmt(G.dist(ln[0], ln[1]) / CM)} cm`;
        return null;
      }
      const [a, b] = ps.map(P);
      return a && b ? `${fmt(G.dist(a, b) / CM)} cm` : null;
    }
    if (o.what === 'area') {
      const poly = polyPoints(ps[0]);
      if (poly) return `${fmt(G.polygonArea(poly) / (CM * CM))} cm²`;
      const c = circleOf(ps[0]);
      if (c) return `${fmt((Math.PI * c.r * c.r) / (CM * CM))} cm²`;
      return null;
    }
    if (o.what === 'slopeM') {
      const ln = lineOf(ps[0]);
      if (!ln) return null;
      const s = G.slope(ln[0], ln[1]);
      return Number.isFinite(s) ? fmt(s) : 'undef';
    }
    if (o.what === 'angle' || o.what === 'dangle') {
      const [a, v, b] = ps.map(P);
      if (!a || !v || !b) return null;
      const deg = o.what === 'angle' ? G.angleAt(a, v, b) : G.directedAngle(a, v, b);
      return `${fmt(deg)}°`;
    }
    return null;
  }

  function measureAnchor(o) {
    const ps = o.parents.map((id) => byId(id));
    if (o.what === 'angle' || o.what === 'dangle') return P(ps[1]);
    if (o.what === 'area' || o.what === 'slopeM') {
      const poly = polyPoints(ps[0]);
      if (poly) {
        return G.pt(poly.reduce((s, p) => s + p.x, 0) / poly.length,
          poly.reduce((s, p) => s + p.y, 0) / poly.length);
      }
      const c = circleOf(ps[0]);
      if (c) return c.centre;
      const ln = lineOf(ps[0]);
      return ln ? G.mid(ln[0], ln[1]) : null;
    }
    if (ps.length === 1) {
      const ln = lineOf(ps[0]);
      const poly = polyPoints(ps[0]);
      if (poly) return poly[0];
      const c = circleOf(ps[0]);
      if (c) return c.centre;
      return ln ? G.mid(ln[0], ln[1]) : null;
    }
    const [a, b] = ps.map(P);
    return a && b ? G.mid(a, b) : null;
  }

  const fmt = (v) => String(Number(v.toFixed(2)));

  /* ---------------- hit testing ---------------- */

  function hitPoint() {
    let best = null;
    let bd = HIT;
    for (const o of objs) {
      if (o.kind !== 'point') continue;
      const p = P(o);
      if (!p) continue;
      const d = G.dist(p, ptr);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function hitObject() {
    const p = hitPoint();
    if (p) return p;
    let best = null;
    let bd = HIT;
    for (const o of objs) {
      let d = Infinity;
      const ln = lineOf(o);
      const c = circleOf(o);
      const poly = polyPoints(o);
      if (o.kind === 'segment' || o.kind === 'vector') d = G.distToSegment(ptr, ln[0], ln[1]);
      else if (ln) d = G.distToLine(ptr, ln[0], ln[1]);
      else if (c) d = Math.abs(G.dist(ptr, c.centre) - c.r);
      else if (poly) {
        d = Math.min(...poly.map((q, i) => G.distToSegment(ptr, q, poly[(i + 1) % poly.length])));
      }
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  /** A point for a tool pick: an existing one, or a new free point. */
  function pickPoint() {
    const hit = hitPoint();
    if (hit) return hit.id;
    return add({ kind: 'point', role: 'free', x: ptr.x, y: ptr.y, parents: [], label: labelFor() }).id;
  }

  /* ---------------- tools ---------------- */

  function click() {
    const spec = TOOLS[tool];
    if (!spec) return;

    if (tool === 'pointer') {
      const hit = hitPoint();
      dragging = dragging ? null : (hit && hit.role === 'free' ? hit.id : null);
      if (!dragging && hit && hit.role !== 'free') note = 'That point is constructed';
      return;
    }

    if (tool === 'delete') {
      const hit = hitObject();
      if (hit) removeWithDependents(hit.id);
      return;
    }

    if (tool === 'point') {
      add({ kind: 'point', role: 'free', x: ptr.x, y: ptr.y, parents: [], label: labelFor() });
      return;
    }

    if (tool === 'polygon') {
      const id = pickPoint();
      if (picks.length >= 3 && id === picks[0]) { finishPolygon(); return; }
      picks.push(id);
      return;
    }

    picks.push(spec.wants === 'object' || spec.wants === 'mixed' ? (hitObject()?.id ?? pickPoint()) : pickPoint());
    if (picks.length >= spec.picks) build();
  }

  function finishPolygon() {
    add({ kind: 'polygon', parents: [...picks], parentsLabel: '' });
    picks = [];
  }

  function build() {
    const p = picks;
    picks = [];
    const mk = (o) => add(o);

    switch (tool) {
      case 'segment': case 'line': case 'ray': case 'vector':
        mk({ kind: tool, parents: p }); break;
      case 'circle': mk({ kind: 'circle', parents: p }); break;
      case 'triangle': mk({ kind: 'triangle', parents: p }); break;
      case 'rectangle': mk({ kind: 'rectangle', parents: p }); break;
      case 'arc': mk({ kind: 'arc', parents: p }); break;
      case 'regular': {
        // a regular hexagon around the centre, through the second point
        const c = P(byId(p[0]));
        const v = P(byId(p[1]));
        const n = 6;
        const ids = [p[1]];
        for (let i = 1; i < n; i += 1) {
          ids.push(mk({ kind: 'point', role: 'rotate', parents: [p[1], p[0]], deg: (360 * i) / n, label: labelFor() }).id);
        }
        mk({ kind: 'polygon', parents: ids });
        break;
      }
      case 'midpoint':
        mk({ kind: 'point', role: 'mid', parents: p, label: labelFor() }); break;
      case 'pointOn':
        mk({ kind: 'point', role: 'on', parents: p, t: 0.5, label: labelFor() }); break;
      case 'intersection': {
        const hits = intersectionsOf(byId(p[0]), byId(p[1]));
        if (!hits.length) { note = 'No intersection'; break; }
        hits.forEach((_, i) => mk({ kind: 'point', role: 'intersect', parents: p, which: i, label: labelFor() }));
        break;
      }
      case 'parallel': case 'perpendicular': case 'tangent':
        mk({ kind: tool === 'tangent' ? 'tangent' : tool, parents: p }); break;
      case 'perpBisector': mk({ kind: 'perpBisector', parents: p }); break;
      case 'angleBisector': mk({ kind: 'angleBisector', parents: p }); break;

      case 'symmetry': case 'reflection': case 'rotation': case 'dilation': case 'translation':
        applyTransform(p); break;

      case 'length': case 'area': case 'slopeM': case 'angle': case 'dangle':
        mk({ kind: 'measure', what: tool, parents: p, dx: 6, dy: -6 }); break;
      default: break;
    }
  }

  /** Transform every point of the picked object, then rebuild its shape. */
  function applyTransform(p) {
    const src = byId(p[0]);
    if (!src) return;
    const role = { symmetry: 'symmetry', reflection: 'reflect', rotation: 'rotate', dilation: 'dilate', translation: 'translate' }[tool];
    const extra = tool === 'rotation' ? { deg: 90 } : tool === 'dilation' ? { k: 2 } : {};
    const rest = p.slice(1);

    const mapPoint = (ptId) =>
      add({ kind: 'point', role, parents: [ptId, ...rest], ...extra, label: labelFor() }).id;

    if (src.kind === 'point') { mapPoint(src.id); return; }
    if (!src.parents || !src.parents.length) { note = 'Cannot transform that'; return; }
    const mapped = src.parents.map(mapPoint);
    add({ kind: src.kind, parents: mapped });
  }

  function removeWithDependents(id) {
    const doomed = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const o of objs) {
        if (doomed.has(o.id)) continue;
        if ((o.parents ?? []).some((pid) => doomed.has(pid))) { doomed.add(o.id); grew = true; }
      }
    }
    for (let i = objs.length - 1; i >= 0; i -= 1) if (doomed.has(objs[i].id)) objs.splice(i, 1);
  }

  /* ---------------- menu ---------------- */

  function onMenuPick(item) {
    const ins = item.ins ?? '';
    if (!ins.startsWith('\u0000')) return;
    const [verb, arg] = ins.slice(1).split(':');
    if (verb === 'tool') { tool = arg; picks = []; dragging = null; note = TOOL_HINT[arg] ?? ''; }
    else if (verb === 'grid') grid = arg;
    else if (verb === 'view' && arg === 'labels') showLabels = !showLabels;
    else if (verb === 'act' && arg === 'deleteAll') { objs.length = 0; picks = []; nextLabel = 0; }
    else note = `"${item.label}" is not built yet`;
    refresh();
  }

  /* ---------------- rendering ---------------- */

  function draw() {
    let g = '';
    if (grid !== 'none') {
      for (let x = 0; x <= W; x += CM) g += svgEl('line', { x1: x, y1: 0, x2: x, y2: H, class: `ge-grid ge-${grid}` });
      for (let y = 0; y <= H; y += CM) g += svgEl('line', { x1: 0, y1: y, x2: W, y2: y, class: `ge-grid ge-${grid}` });
    }

    for (const o of objs) {
      if (o.kind === 'point' || o.kind === 'measure') continue;
      const c = circleOf(o);
      if (c) { g += svgEl('circle', { cx: c.centre.x, cy: c.centre.y, r: c.r, class: 'ge-shape' }); continue; }
      const poly = polyPoints(o);
      if (poly) {
        g += svgEl('polygon', { points: poly.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '), class: 'ge-shape' });
        continue;
      }
      if (o.kind === 'arc') {
        const [a, m, b] = o.parents.map((id) => P(byId(id)));
        if (a && m && b) g += svgEl('path', { d: arcPath(a, m, b), class: 'ge-shape' });
        continue;
      }
      const ln = lineOf(o);
      if (!ln) continue;
      if (o.kind === 'segment') {
        g += svgEl('line', { x1: ln[0].x, y1: ln[0].y, x2: ln[1].x, y2: ln[1].y, class: 'ge-line' });
      } else if (o.kind === 'vector') {
        g += svgEl('line', { x1: ln[0].x, y1: ln[0].y, x2: ln[1].x, y2: ln[1].y, class: 'ge-line' });
        const d = G.unit(G.sub(ln[0], ln[1]));
        const n = G.pt(-d.y, d.x);
        const tip = ln[1];
        const b1 = G.add(G.add(tip, G.mul(d, 6)), G.mul(n, 3));
        const b2 = G.add(G.add(tip, G.mul(d, 6)), G.mul(n, -3));
        g += svgEl('polygon', { points: `${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`, class: 'ge-arrow' });
      } else {
        const clipped = o.kind === 'ray' ? G.clipRay(ln[0], ln[1], RECT) : G.clipLine(ln[0], ln[1], RECT);
        if (clipped) {
          const cls = ['parallel', 'perpendicular', 'perpBisector', 'angleBisector', 'tangent'].includes(o.kind)
            ? 'ge-construct' : 'ge-line';
          g += svgEl('line', { x1: clipped[0].x, y1: clipped[0].y, x2: clipped[1].x, y2: clipped[1].y, class: cls });
        }
      }
    }

    for (const o of objs) {
      if (o.kind !== 'point') continue;
      const p = P(o);
      if (!p) continue;
      const sel = picks.includes(o.id);
      g += svgEl('circle', {
        cx: p.x, cy: p.y, r: 2.8,
        class: `ge-pt${o.role === 'free' ? '' : ' derived'}${sel ? ' sel' : ''}${dragging === o.id ? ' drag' : ''}`,
      });
      if (showLabels && o.label) g += svgEl('text', { x: p.x + 4, y: p.y - 4, class: 'ge-lbl' }, o.label);
    }

    for (const o of objs) {
      if (o.kind !== 'measure') continue;
      const v = measureValue(o);
      const a = measureAnchor(o);
      if (!v || !a) continue;
      g += svgEl('text', { x: a.x + o.dx, y: a.y + o.dy, class: 'ge-measure' }, v);
    }

    // pointer
    g += svgEl('path', {
      d: `M${ptr.x},${ptr.y} l0,10 l3,-3 l3,5 l2,-1 l-3,-5 l4,0 z`,
      class: 'ge-ptr',
    });
    return g;
  }

  function arcPath(a, m, b) {
    const c = G.intersectLines(
      G.mid(a, m), G.add(G.mid(a, m), G.pt(-(m.y - a.y), m.x - a.x)),
      G.mid(m, b), G.add(G.mid(m, b), G.pt(-(b.y - m.y), b.x - m.x))
    );
    if (!c) return `M${a.x},${a.y} L${b.x},${b.y}`;
    const r = G.dist(c, a);
    const cross = (m.x - a.x) * (b.y - a.y) - (m.y - a.y) * (b.x - a.x);
    return `M${a.x.toFixed(1)},${a.y.toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 ${cross < 0 ? 1 : 0} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }

  return {
    id: 'geometry',
    title: 'Geometry',

    serialize: () => ({ objs: JSON.parse(JSON.stringify(objs)), nextId, nextLabel, grid, showLabels }),
    restore(state) {
      if (!state) return;
      objs.length = 0;
      (state.objs ?? []).forEach((o) => objs.push(o));
      nextId = state.nextId ?? (objs.reduce((m, o) => Math.max(m, o.id), 0) + 1);
      nextLabel = state.nextLabel ?? 0;
      grid = state.grid ?? 'none';
      showLabels = state.showLabels !== false;
      picks = [];
      dragging = null;
    },

    onKey(ev) {
      const { id, ctrl } = ev;
      if (id === 'menu') { openMenu(GEOMETRY_MENU, onMenuPick); return true; }

      const step = ctrl ? 1 : 4;
      const move = { left: [-step, 0], right: [step, 0], up: [0, -step], down: [0, step] }[id];
      if (move) {
        ptr = { x: clamp(ptr.x + move[0], 0, W), y: clamp(ptr.y + move[1], 0, H) };
        if (dragging) {
          const o = byId(dragging);
          if (o) { o.x = ptr.x; o.y = ptr.y; }
        }
        refresh();
        return true;
      }

      if (id === 'click' || id === 'enter') { note = ''; click(); refresh(); return true; }
      if (id === 'esc') {
        if (picks.length || dragging) { picks = []; dragging = null; refresh(); return true; }
        return false;
      }
      if (id === 'del') {
        const hit = hitObject();
        if (hit) { removeWithDependents(hit.id); refresh(); }
        return true;
      }
      return false;
    },

    mount(host) {
      const spec = TOOLS[tool];
      const need = spec?.picks ?? 0;
      const status = tool === 'pointer'
        ? (dragging ? 'Dragging — click to drop' : 'Pointer')
        : `${labelOf(tool)}${need > 0 ? ` (${picks.length}/${need})` : ''}`;

      host.innerHTML =
        `<svg class="ge-svg" viewBox="0 0 ${W} ${H}"><rect x="0" y="0" width="${W}" height="${H}" class="ge-bg"/>${draw()}` +
        svgEl('text', { x: W - 4, y: 11, class: 'ge-scale' }, '1 cm') +
        svgEl('line', { x1: W - 34, y1: 14, x2: W - 4, y2: 14, class: 'ge-scalebar' }) +
        '</svg>' +
        `<div class="ge-status"><span class="ge-tool">${esc(status)}</span>` +
        `<span class="ge-hint">${esc(note || TOOL_HINT[tool] || '')}</span></div>`;

      host.addEventListener('mousedown', (e) => {
        const svg = host.querySelector('.ge-svg');
        const r = svg.getBoundingClientRect();
        ptr = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
        note = '';
        click();
        refresh();
      });
    },
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const labelOf = (t) => t.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
