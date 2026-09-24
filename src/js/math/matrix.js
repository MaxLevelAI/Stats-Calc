// Matrix and vector operations.
//
// A matrix is a list of equal-length lists, which is how the parser already
// reads [[1,2],[3,4]]. Everything here works on plain arrays of numbers and
// leaves the symbolic layer to the caller.

/* ------------------------------ shape ------------------------------ */

export const isMatrix = (m) => Array.isArray(m) && m.length > 0 && m.every(
  (r) => Array.isArray(r) && r.length === m[0].length && r.length > 0
);

export const rows = (m) => m.length;
export const cols = (m) => m[0].length;

export function requireSquare(m) {
  if (!isMatrix(m) || rows(m) !== cols(m)) throw new Error('Expected a square matrix');
  return m;
}

const clone = (m) => m.map((r) => r.slice());

/* ------------------------------ construction ------------------------------ */

export const newMat = (r, c) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => 0));

export const identity = (n) =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

/** diag of a list makes a diagonal matrix; diag of a matrix extracts it. */
export function diag(x) {
  if (isMatrix(x)) return x.map((r, i) => r[i]);
  return x.map((v, i) => x.map((_, j) => (i === j ? v : 0)));
}

export const transpose = (m) => m[0].map((_, j) => m.map((r) => r[j]));

export function augment(a, b) {
  if (rows(a) !== rows(b)) throw new Error('Dimension error');
  return a.map((r, i) => [...r, ...b[i]]);
}

export function colAugment(a, b) {
  if (cols(a) !== cols(b)) throw new Error('Dimension error');
  return [...clone(a), ...clone(b)];
}

export function subMat(m, r1 = 1, c1 = 1, r2 = rows(m), c2 = cols(m)) {
  return m.slice(r1 - 1, r2).map((r) => r.slice(c1 - 1, c2));
}

/* ------------------------------ arithmetic ------------------------------ */

export function matMul(a, b) {
  if (cols(a) !== rows(b)) throw new Error('Dimension error');
  return a.map((row) =>
    b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
}

export const scale = (m, k) => m.map((r) => r.map((v) => v * k));

/* ------------------------------ elimination ------------------------------ */

/**
 * Row-reduce in place, returning the pivot count and the determinant factor
 * picked up from swaps and scaling. `reduced` also clears above each pivot.
 */
function eliminate(M, reduced) {
  const R = M.length;
  const C = M[0].length;
  let det = 1;
  let pivot = 0;

  for (let c = 0; c < C && pivot < R; c += 1) {
    let best = pivot;
    for (let r = pivot + 1; r < R; r += 1) {
      if (Math.abs(M[r][c]) > Math.abs(M[best][c])) best = r;
    }
    if (Math.abs(M[best][c]) < 1e-12) continue;

    if (best !== pivot) { [M[pivot], M[best]] = [M[best], M[pivot]]; det = -det; }

    const p = M[pivot][c];
    det *= p;
    for (let j = c; j < C; j += 1) M[pivot][j] /= p;

    const from = reduced ? 0 : pivot + 1;
    for (let r = from; r < R; r += 1) {
      if (r === pivot) continue;
      const f = M[r][c];
      if (f === 0) continue;
      for (let j = c; j < C; j += 1) M[r][j] -= f * M[pivot][j];
    }
    pivot += 1;
  }
  return { rank: pivot, det };
}

export function ref(m) {
  const M = clone(m);
  eliminate(M, false);
  return tidy(M);
}

export function rref(m) {
  const M = clone(m);
  eliminate(M, true);
  return tidy(M);
}

export function det(m) {
  requireSquare(m);
  const M = clone(m);
  const { rank, det: d } = eliminate(M, false);
  return rank < rows(m) ? 0 : snap(d);
}

export function rank(m) {
  const M = clone(m);
  return eliminate(M, true).rank;
}

export function inverse(m) {
  requireSquare(m);
  const n = rows(m);
  const M = augment(m, identity(n));
  const W = clone(M);
  const { rank: rk } = eliminate(W, true);
  if (rk < n) throw new Error('Singular matrix');
  return tidy(W.map((r) => r.slice(n)));
}

/** Solve A x = b, the way TI's simult does. */
export function simult(a, b) {
  requireSquare(a);
  const rhs = isMatrix(b) ? b : b.map((v) => [v]);
  if (rows(rhs) !== rows(a)) throw new Error('Dimension error');
  const W = clone(augment(a, rhs));
  const { rank: rk } = eliminate(W, true);
  if (rk < rows(a)) throw new Error('Singular matrix');
  return tidy(W.map((r) => r.slice(cols(a))));
}

/* ------------------------------ norms and traces ------------------------------ */

export const trace = (m) => snap(requireSquare(m).reduce((s, r, i) => s + r[i], 0));

export const norm = (m) => snap(Math.sqrt(m.reduce((s, r) => s + r.reduce((t, v) => t + v * v, 0), 0)));

export const rowNorm = (m) => Math.max(...m.map((r) => r.reduce((s, v) => s + Math.abs(v), 0)));

export const colNorm = (m) => Math.max(...transpose(m).map((r) => r.reduce((s, v) => s + Math.abs(v), 0)));

/* ------------------------------ row operations ------------------------------ */

export function rowSwap(m, i, j) {
  const M = clone(m);
  [M[i - 1], M[j - 1]] = [M[j - 1], M[i - 1]];
  return M;
}

export function rowAdd(m, from, to) {
  const M = clone(m);
  M[to - 1] = M[to - 1].map((v, k) => v + M[from - 1][k]);
  return M;
}

export function mRow(k, m, i) {
  const M = clone(m);
  M[i - 1] = M[i - 1].map((v) => v * k);
  return M;
}

export function mRowAdd(k, m, from, to) {
  const M = clone(m);
  M[to - 1] = M[to - 1].map((v, j) => v + k * M[from - 1][j]);
  return M;
}

/* ------------------------------ eigenvalues ------------------------------ */

/** Characteristic polynomial coefficients, lowest power first (Faddeev-LeVerrier). */
export function charPoly(m) {
  requireSquare(m);
  const n = rows(m);
  let M = identity(n);
  const c = new Array(n + 1).fill(0);
  c[n] = 1;
  for (let k = 1; k <= n; k += 1) {
    M = matMul(m, M);
    const t = trace(M);
    const ck = -t / k;
    c[n - k] = ck;
    for (let i = 0; i < n; i += 1) M[i][i] += ck;
  }
  return c;
}

/** Real eigenvalues, by finding the roots of the characteristic polynomial. */
export function eigenvalues(m) {
  const c = charPoly(m);
  return realRoots(c).sort((a, b) => a - b);
}

/** An eigenvector for each eigenvalue, from the null space of (A - lambda I). */
export function eigenvectors(m) {
  const n = rows(m);
  return eigenvalues(m).map((lam) => {
    const A = m.map((r, i) => r.map((v, j) => v - (i === j ? lam : 0)));
    const W = clone(A);
    eliminate(W, true);
    // find a free column and read the vector off the reduced form
    const pivotCol = [];
    for (let r = 0; r < n; r += 1) {
      const c = W[r].findIndex((v) => Math.abs(v - 1) < 1e-9);
      if (c >= 0) pivotCol.push(c);
    }
    const free = [...Array(n).keys()].find((c) => !pivotCol.includes(c));
    const v = new Array(n).fill(0);
    if (free === undefined) { v[n - 1] = 1; return normalise(v); }
    v[free] = 1;
    pivotCol.forEach((c, r) => { v[c] = -W[r][free]; });
    return normalise(v);
  });
}

function normalise(v) {
  const m = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const out = v.map((x) => x / m);
  const first = out.find((x) => Math.abs(x) > 1e-9);
  return first < 0 ? out.map((x) => -x) : out;
}

/** Real roots of a polynomial given lowest power first, via Durand-Kerner. */
function realRoots(co) {
  const c = co.slice();
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-14) c.pop();
  const n = c.length - 1;
  if (n < 1) return [];
  const a = c.map((v) => v / c[n]);
  let z = Array.from({ length: n }, (_, i) => {
    const ang = (2 * Math.PI * i) / n + 0.4;
    return { re: Math.cos(ang) * 1.5, im: Math.sin(ang) * 1.5 };
  });
  const evalAt = (p) => {
    let re = 0;
    let im = 0;
    for (let i = n; i >= 0; i -= 1) {
      const nr = re * p.re - im * p.im + a[i];
      im = re * p.im + im * p.re;
      re = nr;
    }
    return { re, im };
  };
  for (let it = 0; it < 600; it += 1) {
    for (let i = 0; i < n; i += 1) {
      let dr = 1;
      let di = 0;
      for (let j = 0; j < n; j += 1) {
        if (i === j) continue;
        const er = z[i].re - z[j].re;
        const ei = z[i].im - z[j].im;
        const nr = dr * er - di * ei;
        di = dr * ei + di * er;
        dr = nr;
      }
      const p = evalAt(z[i]);
      const den = dr * dr + di * di;
      if (den < 1e-300) continue;
      z[i] = {
        re: z[i].re - (p.re * dr + p.im * di) / den,
        im: z[i].im - (p.im * dr - p.re * di) / den,
      };
    }
  }
  return z.filter((p) => Math.abs(p.im) < 1e-6).map((p) => snap(p.re));
}

/* ------------------------------ vectors ------------------------------ */

export function dotP(a, b) {
  if (a.length !== b.length) throw new Error('Dimension error');
  return snap(a.reduce((s, v, i) => s + v * b[i], 0));
}

export function crossP(a, b) {
  if (a.length !== 3 || b.length !== 3) throw new Error('Cross product needs 3 elements');
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function unitV(v) {
  const m = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (m < 1e-14) throw new Error('Zero vector');
  return v.map((x) => x / m);
}

/* ------------------------------ tidying ------------------------------ */

/**
 * Elimination accumulates rounding error, so a determinant that is really an
 * integer can come back as -305.99999999999994. Snap when the drift is small
 * relative to the magnitude, not just in absolute terms.
 */
export const snap = (v) => {
  if (!Number.isFinite(v)) return v;
  const r = Math.round(v);
  const tol = 1e-9 * Math.max(1, Math.abs(v));
  return Math.abs(v - r) < tol ? r : Number(v.toPrecision(12));
};

export const tidy = (m) => m.map((r) => r.map(snap));
