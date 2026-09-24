// Plane-geometry primitives for the Geometry application.
// Everything works in screen coordinates; y grows downward, which only
// matters for slope and angle, handled explicitly below.

export const pt = (x, y) => ({ x, y });

export const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

export const mid = (a, b) => pt((a.x + b.x) / 2, (a.y + b.y) / 2);

export const sub = (a, b) => pt(a.x - b.x, a.y - b.y);
export const add = (a, b) => pt(a.x + b.x, a.y + b.y);
export const mul = (a, k) => pt(a.x * k, a.y * k);

export function unit(v) {
  const m = Math.hypot(v.x, v.y);
  return m < 1e-12 ? pt(0, 0) : pt(v.x / m, v.y / m);
}

/** Slope in ordinary maths orientation (screen y is inverted). */
export function slope(a, b) {
  const dx = b.x - a.x;
  if (Math.abs(dx) < 1e-12) return Infinity;
  return -(b.y - a.y) / dx;
}

/** Interior angle at `v` between rays v->a and v->b, in degrees. */
export function angleAt(a, v, b) {
  const u = sub(a, v);
  const w = sub(b, v);
  const cos = (u.x * w.x + u.y * w.y) / (Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/** Signed angle from v->a to v->b, counter-clockwise on screen, in degrees. */
export function directedAngle(a, v, b) {
  const u = sub(a, v);
  const w = sub(b, v);
  const ang = Math.atan2(u.x * w.y - u.y * w.x, u.x * w.x + u.y * w.y);
  return (-ang * 180) / Math.PI;
}

export function polygonArea(points) {
  let s = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function polygonPerimeter(points) {
  let s = 0;
  for (let i = 0; i < points.length; i += 1) s += dist(points[i], points[(i + 1) % points.length]);
  return s;
}

/* ------------------------------ lines ------------------------------ */

/** Intersection of the infinite lines through a1a2 and b1b2. */
export function intersectLines(a1, a2, b1, b2) {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-12) return null; // parallel
  const t = ((b1.x - a1.x) * d2.y - (b1.y - a1.y) * d2.x) / den;
  return pt(a1.x + d1.x * t, a1.y + d1.y * t);
}

/** Foot of the perpendicular from p to the line a1a2. */
export function perpFoot(p, a1, a2) {
  const d = sub(a2, a1);
  const len2 = d.x * d.x + d.y * d.y;
  if (len2 < 1e-12) return a1;
  const t = ((p.x - a1.x) * d.x + (p.y - a1.y) * d.y) / len2;
  return pt(a1.x + d.x * t, a1.y + d.y * t);
}

export const distToLine = (p, a1, a2) => dist(p, perpFoot(p, a1, a2));

/** Distance to the segment a1a2, not the infinite line. */
export function distToSegment(p, a1, a2) {
  const d = sub(a2, a1);
  const len2 = d.x * d.x + d.y * d.y;
  if (len2 < 1e-12) return dist(p, a1);
  let t = ((p.x - a1.x) * d.x + (p.y - a1.y) * d.y) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, pt(a1.x + d.x * t, a1.y + d.y * t));
}

/**
 * Clip the infinite line through a1a2 to a rectangle, for drawing.
 * Liang-Barsky, with the parameter range left unbounded so the whole line
 * is considered rather than just the a1..a2 segment.
 */
export function clipLine(a1, a2, rect) {
  const d = sub(a2, a1);
  if (Math.abs(d.x) < 1e-12 && Math.abs(d.y) < 1e-12) return null;

  let tMin = -Infinity;
  let tMax = Infinity;
  const edges = [
    [-d.x, a1.x - rect.x0],
    [d.x, rect.x1 - a1.x],
    [-d.y, a1.y - rect.y0],
    [d.y, rect.y1 - a1.y],
  ];
  for (const [p, q] of edges) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return null; // parallel to this edge and outside it
      continue;
    }
    const r = q / p;
    if (p < 0) tMin = Math.max(tMin, r);
    else tMax = Math.min(tMax, r);
  }
  if (tMin > tMax) return null;
  return [
    pt(a1.x + d.x * tMin, a1.y + d.y * tMin),
    pt(a1.x + d.x * tMax, a1.y + d.y * tMax),
  ];
}

/** Clip a ray (from a1 through a2) to a rectangle. */
export function clipRay(a1, a2, rect) {
  const seg = clipLine(a1, a2, rect);
  if (!seg) return null;
  const d = sub(a2, a1);
  const tOf = (p) => (Math.abs(d.x) > Math.abs(d.y) ? (p.x - a1.x) / d.x : (p.y - a1.y) / d.y);
  let [s, e] = seg;
  if (tOf(s) < 0 && tOf(e) < 0) return null;
  if (tOf(s) < 0) s = a1;
  if (tOf(e) < 0) e = a1;
  return [s, e];
}

/* ------------------------------ circles ------------------------------ */

export function intersectLineCircle(a1, a2, c, r) {
  const d = sub(a2, a1);
  const f = sub(a1, c);
  const A = d.x * d.x + d.y * d.y;
  const B = 2 * (f.x * d.x + f.y * d.y);
  const C = f.x * f.x + f.y * f.y - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-12) return [];
  const s = Math.sqrt(disc);
  const ts = [(-B - s) / (2 * A), (-B + s) / (2 * A)];
  return ts.map((t) => pt(a1.x + d.x * t, a1.y + d.y * t));
}

export function intersectCircles(c1, r1, c2, r2) {
  const d = dist(c1, c2);
  if (d < 1e-12 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  if (h2 < 0) return [];
  const h = Math.sqrt(h2);
  const base = add(c1, mul(unit(sub(c2, c1)), a));
  const n = pt(-(c2.y - c1.y) / d, (c2.x - c1.x) / d);
  return [add(base, mul(n, h)), add(base, mul(n, -h))];
}

/* ------------------------------ transformations ------------------------------ */

export function reflectPoint(p, a1, a2) {
  const f = perpFoot(p, a1, a2);
  return pt(2 * f.x - p.x, 2 * f.y - p.y);
}

export const symmetryPoint = (p, c) => pt(2 * c.x - p.x, 2 * c.y - p.y);

export function rotatePoint(p, c, deg) {
  const r = (-deg * Math.PI) / 180; // screen y is inverted
  const d = sub(p, c);
  return pt(
    c.x + d.x * Math.cos(r) - d.y * Math.sin(r),
    c.y + d.x * Math.sin(r) + d.y * Math.cos(r)
  );
}

export const dilatePoint = (p, c, k) => add(c, mul(sub(p, c), k));

export const translatePoint = (p, v) => add(p, v);

/** Bisector direction of the angle a-v-b. */
export function angleBisectorDir(a, v, b) {
  const u = unit(sub(a, v));
  const w = unit(sub(b, v));
  const s = add(u, w);
  if (Math.hypot(s.x, s.y) < 1e-9) return pt(-u.y, u.x); // opposite rays
  return unit(s);
}
