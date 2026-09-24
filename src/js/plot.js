// Shared plotting helpers: axis scaling, tick selection and small SVG
// builders. Data & Statistics uses these now; Graphs will reuse them.

/** Round a range outward to pleasant tick values. */
export function niceTicks(min, max, target = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const c = Number.isFinite(min) ? min : 0;
    return { ticks: [c - 1, c, c + 1], step: 1 };
  }
  const raw = (max - min) / Math.max(1, target);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const first = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = first; v <= max + step * 1e-9 && ticks.length < 40; v += step) {
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return { ticks, step };
}

/** Pad a data range so points do not sit on the frame. */
export function padRange(min, max, frac = 0.08) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * frac;
  return [min - pad, max + pad];
}

export const scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Format an axis tick compactly. */
export function tickLabel(v, step) {
  if (v === 0) return '0';
  const decimals = Math.max(0, Math.min(6, -Math.floor(Math.log10(Math.abs(step))) + 0));
  const s = Math.abs(v) >= 1e5 || Math.abs(v) < 1e-4
    ? v.toExponential(1)
    : v.toFixed(decimals);
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/* ------------------------------ statistics helpers ------------------------------ */

export function fiveNumber(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  const n = s.length;
  const med = (a) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
  const half = Math.floor(n / 2);
  const q1 = med(s.slice(0, half));
  const q3 = med(n % 2 ? s.slice(half + 1) : s.slice(half));
  return { min: s[0], q1, med: med(s), q3, max: s[n - 1], sorted: s };
}

/** Box-plot whiskers stop at 1.5 IQR; anything beyond is an outlier. */
export function boxParts(xs, showOutliers = true) {
  const f = fiveNumber(xs);
  if (!showOutliers) return { ...f, lo: f.min, hi: f.max, outliers: [] };
  const iqr = f.q3 - f.q1;
  const lim = 1.5 * iqr;
  const inside = f.sorted.filter((v) => v >= f.q1 - lim && v <= f.q3 + lim);
  return {
    ...f,
    lo: inside.length ? inside[0] : f.min,
    hi: inside.length ? inside[inside.length - 1] : f.max,
    outliers: f.sorted.filter((v) => v < f.q1 - lim || v > f.q3 + lim),
  };
}

/** Equal-width histogram bins over the data range. */
export function histogram(xs, binCount) {
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const n = binCount || Math.max(1, Math.ceil(Math.sqrt(xs.length)));
  const width = (max - min) / n || 1;
  const bins = Array.from({ length: n }, (_, i) => ({
    lo: min + i * width,
    hi: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of xs) {
    let i = Math.floor((v - min) / width);
    if (i >= n) i = n - 1;
    if (i < 0) i = 0;
    bins[i].count += 1;
  }
  return { bins, width, min, max };
}

/** Stack equal values into columns of dots, the way a dot plot does. */
export function dotStacks(xs, resolution) {
  const counts = new Map();
  const out = [];
  for (const v of xs.slice().sort((a, b) => a - b)) {
    const key = resolution ? Math.round(v / resolution) * resolution : v;
    const k = String(key);
    const level = (counts.get(k) ?? 0) + 1;
    counts.set(k, level);
    out.push({ v: key, level });
  }
  return out;
}

/** Normal scores for a normal probability plot. */
export function normalScores(xs, invNorm) {
  const s = xs.slice().sort((a, b) => a - b);
  const n = s.length;
  return s.map((v, i) => ({ v, z: invNorm((i + 0.5) / n) }));
}

/* ------------------------------ svg ------------------------------ */

export const svgEl = (tag, attrs, inner = '') => {
  const a = Object.entries(attrs)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? round(v) : v}"`)
    .join(' ');
  return inner ? `<${tag} ${a}>${inner}</${tag}>` : `<${tag} ${a}/>`;
};

const round = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
