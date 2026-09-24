// Statistical commands: OneVar/TwoVar, regressions, confidence intervals and
// hypothesis tests.
//
// Output variable names come straight from the CAS Reference Guide's
// "Output variable" tables (extracted to research/statvars.json), so
// stat.v is the mean, stat.CLower/stat.CUpper bound an interval, and so on.
//
// Every function returns an ordered [name, value] list; the engine turns that
// into the stat.* variables and the stat.results table.

import * as D from './dist.js';

/* ------------------------------ helpers ------------------------------ */

/** Expand a frequency list into repeated values (TI allows integer freqs). */
export function weight(xs, freq) {
  if (!freq) return xs.slice();
  const out = [];
  xs.forEach((v, i) => {
    const f = Math.round(freq[i] ?? 1);
    for (let k = 0; k < f; k += 1) out.push(v);
  });
  return out;
}

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => sum(a) / a.length;

function medianOf(sorted) {
  const n = sorted.length;
  if (!n) return NaN;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/**
 * Quartiles the way TI computes them: split at the median and, for an odd
 * count, leave the median out of both halves.
 */
export function quartiles(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  const n = s.length;
  const med = medianOf(s);
  const half = Math.floor(n / 2);
  const lower = s.slice(0, half);
  const upper = n % 2 ? s.slice(half + 1) : s.slice(half);
  return { q1: medianOf(lower), med, q3: medianOf(upper), min: s[0], max: s[n - 1] };
}

export function varianceOf(xs, ddof) {
  const n = xs.length;
  const m = mean(xs);
  return sum(xs.map((v) => (v - m) ** 2)) / (n - ddof);
}

/* ------------------------------ one and two variable ------------------------------ */

export function oneVar(xs, freq) {
  const x = weight(xs, freq);
  const n = x.length;
  if (!n) throw new Error('Dimension error');
  const m = mean(x);
  const q = quartiles(x);
  const ssx = sum(x.map((v) => (v - m) ** 2));
  return [
    ['stat.v', m],
    ['stat.Σx', sum(x)],
    ['stat.Σx2', sum(x.map((v) => v * v))],
    ['stat.sx', n > 1 ? Math.sqrt(ssx / (n - 1)) : NaN],
    ['stat.σx', Math.sqrt(ssx / n)],
    ['stat.n', n],
    ['stat.MinX', q.min],
    ['stat.Q1X', q.q1],
    ['stat.MedianX', q.med],
    ['stat.Q3X', q.q3],
    ['stat.MaxX', q.max],
    ['stat.SSX', ssx],
  ];
}

export function twoVar(xs, ys, freq) {
  const x = weight(xs, freq);
  const y = weight(ys, freq);
  if (x.length !== y.length) throw new Error('Dimension error');
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  const sxx = sum(x.map((v) => (v - mx) ** 2));
  const syy = sum(y.map((v) => (v - my) ** 2));
  const sxy = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
  const qx = quartiles(x);
  const qy = quartiles(y);
  return [
    ['stat.v', mx],
    ['stat.Σx', sum(x)],
    ['stat.Σx2', sum(x.map((v) => v * v))],
    ['stat.sx', Math.sqrt(sxx / (n - 1))],
    ['stat.σx', Math.sqrt(sxx / n)],
    ['stat.n', n],
    ['stat.w', my],
    ['stat.Σy', sum(y)],
    ['stat.Σy2', sum(y.map((v) => v * v))],
    ['stat.sy', Math.sqrt(syy / (n - 1))],
    ['stat.σy', Math.sqrt(syy / n)],
    ['stat.Σxy', sum(x.map((v, i) => v * y[i]))],
    ['stat.r', sxy / Math.sqrt(sxx * syy)],
    ['stat.MinX', qx.min], ['stat.Q1X', qx.q1], ['stat.MedianX', qx.med],
    ['stat.Q3X', qx.q3], ['stat.MaxX', qx.max],
    ['stat.MinY', qy.min], ['stat.Q1Y', qy.q1], ['stat.MedY', qy.med],
    ['stat.Q3Y', qy.q3], ['stat.MaxY', qy.max],
  ];
}

/* ------------------------------ linear algebra ------------------------------ */

/** Solve a small dense system by Gaussian elimination with partial pivoting. */
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let piv = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-14) throw new Error('Singular matrix');
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
    }
  }
  // after full elimination the matrix is diagonal: x[i] = M[i][n] / M[i][i]
  return M.map((row, i) => row[n] / row[i]);
}

/** Least-squares polynomial fit, returning coefficients lowest power first. */
export function polyFit(x, y, deg) {
  const n = deg + 1;
  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => sum(x.map((v) => v ** (i + j))))
  );
  const b = Array.from({ length: n }, (_, i) => sum(x.map((v, k) => v ** i * y[k])));
  return solveLinear(A, b);
}

function rSquared(y, fitted) {
  const my = mean(y);
  const ssTot = sum(y.map((v) => (v - my) ** 2));
  const ssRes = sum(y.map((v, i) => (v - fitted[i]) ** 2));
  return 1 - ssRes / ssTot;
}

/* ------------------------------ regressions ------------------------------ */

function linearParts(x, y) {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  const sxx = sum(x.map((v) => (v - mx) ** 2));
  const sxy = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
  const syy = sum(y.map((v) => (v - my) ** 2));
  const b = sxy / sxx;
  const a = my - b * mx;
  const r = sxy / Math.sqrt(sxx * syy);
  const fitted = x.map((v) => a + b * v);
  const resid = y.map((v, i) => v - fitted[i]);
  return { n, a, b, r, sxx, resid, fitted };
}

export function linRegBx(x, y) {
  const p = linearParts(x, y);
  return [
    ['stat.RegEqn', `${fmtNum(p.a)}+${fmtNum(p.b)}·x`],
    ['stat.a', p.a], ['stat.b', p.b],
    ['stat.r2', p.r * p.r], ['stat.r', p.r],
    ['stat.Resid', p.resid],
  ];
}

export function linRegMx(x, y) {
  const p = linearParts(x, y);
  return [
    ['stat.RegEqn', `${fmtNum(p.b)}·x+${fmtNum(p.a)}`],
    ['stat.m', p.b], ['stat.b', p.a],
    ['stat.r2', p.r * p.r], ['stat.r', p.r],
    ['stat.Resid', p.resid],
  ];
}

export function polyReg(x, y, deg, labels) {
  const c = polyFit(x, y, deg);
  const fitted = x.map((v) => c.reduce((s, k, i) => s + k * v ** i, 0));
  const out = [['stat.RegEqn', polyEqn(c)]];
  // TI labels the highest power 'a', descending
  labels.forEach((name, i) => out.push([`stat.${name}`, c[deg - i]]));
  out.push(['stat.R2', rSquared(y, fitted)]);
  out.push(['stat.Resid', y.map((v, i) => v - fitted[i])]);
  return out;
}

export function medMed(x, y) {
  const idx = x.map((_, i) => i).sort((p, q) => x[p] - x[q]);
  const n = idx.length;
  const third = Math.floor(n / 3);
  const extra = n % 3;
  const sizeL = third + (extra > 0 ? 1 : 0);
  const sizeR = third + (extra > 1 ? 1 : 0);
  const groups = [idx.slice(0, sizeL), idx.slice(sizeL, n - sizeR), idx.slice(n - sizeR)];
  const pt = (g) => [
    medianOf(g.map((i) => x[i]).sort((a, b) => a - b)),
    medianOf(g.map((i) => y[i]).sort((a, b) => a - b)),
  ];
  const [[x1, y1], [x2, y2], [x3, y3]] = groups.map(pt);
  const m = (y3 - y1) / (x3 - x1);
  const b = ((y1 - m * x1) + (y2 - m * x2) + (y3 - m * x3)) / 3;
  const fitted = x.map((v) => m * v + b);
  return [
    ['stat.RegEqn', `${fmtNum(m)}·x+${fmtNum(b)}`],
    ['stat.m', m], ['stat.b', b],
    ['stat.Resid', y.map((v, i) => v - fitted[i])],
  ];
}

/** Fits that become linear after transforming x and/or y. */
export function transformedReg(kind, x, y) {
  const pairs = x.map((v, i) => [v, y[i]]);
  let tx;
  let ty;
  let rebuild;
  if (kind === 'ExpReg') {          // y = a*b^x
    if (pairs.some(([, v]) => v <= 0)) throw new Error('Domain error');
    tx = x; ty = y.map(Math.log);
    rebuild = (A, B) => ({ a: Math.exp(A), b: Math.exp(B), eqn: (a, b) => `${fmtNum(a)}·${fmtNum(b)}^x`, f: (a, b, v) => a * b ** v });
  } else if (kind === 'PowerReg') { // y = a*x^b
    if (pairs.some(([u, v]) => u <= 0 || v <= 0)) throw new Error('Domain error');
    tx = x.map(Math.log); ty = y.map(Math.log);
    rebuild = (A, B) => ({ a: Math.exp(A), b: B, eqn: (a, b) => `${fmtNum(a)}·x^${fmtNum(b)}`, f: (a, b, v) => a * v ** b });
  } else {                          // LnReg: y = a + b*ln(x)
    if (pairs.some(([u]) => u <= 0)) throw new Error('Domain error');
    tx = x.map(Math.log); ty = y;
    rebuild = (A, B) => ({ a: A, b: B, eqn: (a, b) => `${fmtNum(a)}+${fmtNum(b)}·ln(x)`, f: (a, b, v) => a + b * Math.log(v) });
  }
  const p = linearParts(tx, ty);
  const { a, b, eqn, f } = rebuild(p.a, p.b);
  const fitted = x.map((v) => f(a, b, v));
  return [
    ['stat.RegEqn', eqn(a, b)],
    ['stat.a', a], ['stat.b', b],
    ['stat.r2', p.r * p.r], ['stat.r', p.r],
    ['stat.Resid', y.map((v, i) => v - fitted[i])],
  ];
}

/* ------------------------------ confidence intervals ------------------------------ */

const zStar = (cl) => D.invNorm(1 - (1 - cl) / 2);
const tStar = (cl, df) => D.invT(1 - (1 - cl) / 2, df);

export function zInterval(sigma, xbar, n, cl = 0.95) {
  const me = zStar(cl) * (sigma / Math.sqrt(n));
  return [
    ['stat.CLower', xbar - me], ['stat.CUpper', xbar + me],
    ['stat.x', xbar], ['stat.ME', me], ['stat.n', n], ['stat.σ', sigma],
  ];
}

export function tInterval(xbar, sx, n, cl = 0.95) {
  const df = n - 1;
  const me = tStar(cl, df) * (sx / Math.sqrt(n));
  return [
    ['stat.CLower', xbar - me], ['stat.CUpper', xbar + me],
    ['stat.v', xbar], ['stat.ME', me], ['stat.df', df],
    ['stat.sx', sx], ['stat.n', n],
  ];
}

export function zInterval2Samp(s1, s2, x1, n1, x2, n2, cl = 0.95) {
  const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
  const me = zStar(cl) * se;
  const diff = x1 - x2;
  return [
    ['stat.CLower', diff - me], ['stat.CUpper', diff + me],
    ['stat.ME', me], ['stat.x1', x1], ['stat.x2', x2],
    ['stat.n1', n1], ['stat.n2', n2],
  ];
}

export function tInterval2Samp(x1, sx1, n1, x2, sx2, n2, cl = 0.95, pooled = false) {
  const { se, df } = twoSampleT(sx1, n1, sx2, n2, pooled);
  const me = tStar(cl, df) * se;
  const diff = x1 - x2;
  return [
    ['stat.CLower', diff - me], ['stat.CUpper', diff + me],
    ['stat.df', df], ['stat.ME', me],
    ['stat.v1', x1], ['stat.v2', x2],
    ['stat.sx1', sx1], ['stat.sx2', sx2],
    ['stat.n1', n1], ['stat.n2', n2],
  ];
}

export function zInterval1Prop(x, n, cl = 0.95) {
  const p = x / n;
  const me = zStar(cl) * Math.sqrt((p * (1 - p)) / n);
  return [
    ['stat.CLower', p - me], ['stat.CUpper', p + me],
    ['stat.̂p', p], ['stat.ME', me], ['stat.n', n],
  ];
}

export function zInterval2Prop(x1, n1, x2, n2, cl = 0.95) {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const me = zStar(cl) * Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const diff = p1 - p2;
  return [
    ['stat.CLower', diff - me], ['stat.CUpper', diff + me],
    ['stat.̂p1', p1], ['stat.̂p2', p2],
    ['stat.ME', me], ['stat.n1', n1], ['stat.n2', n2],
  ];
}

/* ------------------------------ hypothesis tests ------------------------------ */

// Hypoth: -1 => Ha < , 0 => Ha != , 1 => Ha >
function pValue(stat, cdfLower, hyp) {
  if (hyp < 0) return cdfLower(stat);
  if (hyp > 0) return 1 - cdfLower(stat);
  return 2 * (1 - cdfLower(Math.abs(stat)));
}

export function zTest(mu0, sigma, xbar, n, hyp = 0) {
  const z = (xbar - mu0) / (sigma / Math.sqrt(n));
  return [
    ['stat.z', z],
    ['stat.PVal', pValue(z, D.stdNormCdf, hyp)],
    ['stat.x', xbar], ['stat.n', n],
  ];
}

export function tTest(mu0, xbar, sx, n, hyp = 0) {
  const df = n - 1;
  const t = (xbar - mu0) / (sx / Math.sqrt(n));
  return [
    ['stat.t', t],
    ['stat.PVal', pValue(t, (v) => D.tCdfLower(v, df), hyp)],
    ['stat.df', df], ['stat.v', xbar], ['stat.sx', sx], ['stat.n', n],
  ];
}

function twoSampleT(sx1, n1, sx2, n2, pooled) {
  if (pooled) {
    const df = n1 + n2 - 2;
    const sp2 = (((n1 - 1) * sx1 * sx1) + ((n2 - 1) * sx2 * sx2)) / df;
    return { se: Math.sqrt(sp2 * (1 / n1 + 1 / n2)), df, sp: Math.sqrt(sp2) };
  }
  const a = (sx1 * sx1) / n1;
  const b = (sx2 * sx2) / n2;
  const df = (a + b) ** 2 / ((a * a) / (n1 - 1) + (b * b) / (n2 - 1));
  return { se: Math.sqrt(a + b), df, sp: null };
}

export function tTest2Samp(x1, sx1, n1, x2, sx2, n2, hyp = 0, pooled = false) {
  const { se, df, sp } = twoSampleT(sx1, n1, sx2, n2, pooled);
  const t = (x1 - x2) / se;
  const out = [
    ['stat.t', t],
    ['stat.PVal', pValue(t, (v) => D.tCdfLower(v, df), hyp)],
    ['stat.df', df],
    ['stat.v1', x1], ['stat.v2', x2],
    ['stat.sx1', sx1], ['stat.sx2', sx2],
    ['stat.n1', n1], ['stat.n2', n2],
  ];
  if (sp !== null) out.push(['stat.sp', sp]);
  return out;
}

export function zTest2Samp(s1, s2, x1, n1, x2, n2, hyp = 0) {
  const z = (x1 - x2) / Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
  return [
    ['stat.z', z],
    ['stat.PVal', pValue(z, D.stdNormCdf, hyp)],
    ['stat.x1', x1], ['stat.x2', x2], ['stat.n1', n1], ['stat.n2', n2],
  ];
}

export function zTest1Prop(p0, x, n, hyp = 0) {
  const phat = x / n;
  const z = (phat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  return [
    ['stat.p0', p0], ['stat.̂p', phat],
    ['stat.z', z],
    ['stat.PVal', pValue(z, D.stdNormCdf, hyp)],
    ['stat.n', n],
  ];
}

export function zTest2Prop(x1, n1, x2, n2, hyp = 0) {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const z = (p1 - p2) / Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  return [
    ['stat.z', z],
    ['stat.PVal', pValue(z, D.stdNormCdf, hyp)],
    ['stat.̂p1', p1], ['stat.̂p2', p2], ['stat.̂p', pooled],
    ['stat.n1', n1], ['stat.n2', n2],
  ];
}

export function chi2GOF(observed, expected, df) {
  if (observed.length !== expected.length) throw new Error('Dimension error');
  const comp = observed.map((o, i) => ((o - expected[i]) ** 2) / expected[i]);
  const chi2 = sum(comp);
  return [
    ['stat.χ2', chi2],
    ['stat.PVal', 1 - D.chi2CdfLower(chi2, df)],
    ['stat.df', df],
    ['stat.CompList', comp],
  ];
}

/** Two-way (independence) test on an r x c matrix of counts. */
export function chi2TwoWay(obs) {
  const rows = obs.length;
  const cols = obs[0].length;
  const rowT = obs.map(sum);
  const colT = Array.from({ length: cols }, (_, j) => sum(obs.map((r) => r[j])));
  const total = sum(rowT);
  const exp = obs.map((r, i) => r.map((_, j) => (rowT[i] * colT[j]) / total));
  const comp = obs.map((r, i) => r.map((o, j) => ((o - exp[i][j]) ** 2) / exp[i][j]));
  const chi2 = sum(comp.map(sum));
  const df = (rows - 1) * (cols - 1);
  return [
    ['stat.χ2', chi2],
    ['stat.PVal', 1 - D.chi2CdfLower(chi2, df)],
    ['stat.df', df],
    ['stat.ExpMat', exp],
    ['stat.CompMat', comp],
  ];
}

export function linRegTTest(x, y, hyp = 0) {
  const p = linearParts(x, y);
  const n = p.n;
  const df = n - 2;
  const s = Math.sqrt(sum(p.resid.map((v) => v * v)) / df);
  const seSlope = s / Math.sqrt(p.sxx);
  const t = p.b / seSlope;
  return [
    ['stat.RegEqn', `${fmtNum(p.a)}+${fmtNum(p.b)}·x`],
    ['stat.t', t],
    ['stat.PVal', pValue(t, (v) => D.tCdfLower(v, df), hyp)],
    ['stat.df', df],
    ['stat.a', p.a], ['stat.b', p.b],
    ['stat.s', s], ['stat.SESlope', seSlope],
    ['stat.r2', p.r * p.r], ['stat.r', p.r],
    ['stat.Resid', p.resid],
  ];
}

export function linRegTInterval(x, y, cl = 0.95) {
  const p = linearParts(x, y);
  const df = p.n - 2;
  const s = Math.sqrt(sum(p.resid.map((v) => v * v)) / df);
  const seSlope = s / Math.sqrt(p.sxx);
  const me = tStar(cl, df) * seSlope;
  return [
    ['stat.CLower', p.b - me], ['stat.CUpper', p.b + me],
    ['stat.b', p.b], ['stat.ME', me], ['stat.df', df],
    ['stat.s', s], ['stat.SESlope', seSlope],
  ];
}

/** Two-sample F test for equality of variances. */
export function fTest2Samp(sx1, n1, sx2, n2, hyp = 0) {
  const f = (sx1 * sx1) / (sx2 * sx2);
  const d1 = n1 - 1;
  const d2 = n2 - 1;
  const lower = (v) => D.FCdfLower(v, d1, d2);
  let p;
  if (hyp < 0) p = lower(f);
  else if (hyp > 0) p = 1 - lower(f);
  else p = 2 * Math.min(lower(f), 1 - lower(f));
  return [
    ['stat.F', f], ['stat.PVal', p],
    ['stat.dfNumer', d1], ['stat.dfDenom', d2],
    ['stat.sx1', sx1], ['stat.sx2', sx2], ['stat.n1', n1], ['stat.n2', n2],
  ];
}

/** One-way ANOVA across k lists. */
export function anova(lists) {
  const k = lists.length;
  const all = lists.flat();
  const N = all.length;
  const grand = mean(all);
  const ssBetween = sum(lists.map((g) => g.length * (mean(g) - grand) ** 2));
  const ssError = sum(lists.map((g) => { const m = mean(g); return sum(g.map((v) => (v - m) ** 2)); }));
  const df = k - 1;
  const dfError = N - k;
  const ms = ssBetween / df;
  const msError = ssError / dfError;
  const f = ms / msError;
  return [
    ['stat.F', f],
    ['stat.PVal', 1 - D.FCdfLower(f, df, dfError)],
    ['stat.df', df], ['stat.SS', ssBetween], ['stat.MS', ms],
    ['stat.dfError', dfError], ['stat.SSError', ssError], ['stat.MSError', msError],
    ['stat.sp', Math.sqrt(msError)],
    ['stat.xbarlist', lists.map(mean)],
  ];
}

/* ------------------------------ formatting helpers ------------------------------ */

function fmtNum(v) {
  if (!Number.isFinite(v)) return String(v);
  // TI's Float default shows 6 significant digits in a regression equation
  return String(Number(v.toPrecision(6)));
}

function polyEqn(c) {
  const parts = [];
  for (let i = c.length - 1; i >= 0; i -= 1) {
    if (Math.abs(c[i]) < 1e-14) continue;
    const coef = fmtNum(c[i]);
    parts.push(i === 0 ? coef : i === 1 ? `${coef}·x` : `${coef}·x^${i}`);
  }
  return parts.join('+').replace(/\+-/g, '-') || '0';
}
