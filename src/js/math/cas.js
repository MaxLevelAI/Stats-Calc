// CAS operations built on the symbolic core: exact function evaluation,
// differentiation, integration, factoring, and equation solving.

import { Rat } from './rational.js';
import {
  Num, Sym, List, Rel, ZERO, ONE, MONE,
  add, sub, neg, mul, div, pow, sqrt,
  isNum, isZero, isOne, key, expand,
  polyCoeffs, polyToExpr, rationalRoots, deflate, containsSym, freeVars,
} from './sym.js';

export const PI = Sym('π');
export const E = Sym('ℯ'); // TI's script e

const Fn = (name, args) => ({ k: 'fn', name, args });
const R = (n, d = 1) => new Rat(BigInt(n), BigInt(d));

/**
 * Document settings, with the value sets the guidebook lists.
 *   digits: 'FLOAT' | { float: 1..12 } | { fix: 0..12 }
 *   calc:   'AUTO' | 'EXACT' | 'APPROX'
 *   expo:   'NORMAL' | 'SCI' | 'ENG'
 */
export const settings = {
  angle: 'RAD',
  digits: 'FLOAT',
  calc: 'AUTO',
  expo: 'NORMAL',
};

/* ============================== exact values ============================== */

// sin of k*pi/12, k = 0..23, as exact expressions where a closed form exists.
const HALF = Num(R(1, 2));
const SQRT2_2 = mul(HALF, sqrt(Num(2)));
const SQRT3_2 = mul(HALF, sqrt(Num(3)));

const SIN_TABLE = new Map([
  ['0', ZERO],
  ['1/6', HALF],
  ['1/4', SQRT2_2],
  ['1/3', SQRT3_2],
  ['1/2', ONE],
  ['2/3', SQRT3_2],
  ['3/4', SQRT2_2],
  ['5/6', HALF],
  ['1', ZERO],
]);

/** sin(q*pi) for rational q, exact when the table knows it. */
function exactSin(q) {
  let r = q;
  // fold into [0, 2)
  const two = R(2);
  while (r.cmp(R(0)) < 0) r = r.add(two);
  while (r.cmp(two) >= 0) r = r.sub(two);
  const negate = r.cmp(R(1)) >= 0;
  if (negate) r = r.sub(R(1));
  const hit = SIN_TABLE.get(r.toString());
  if (!hit) return null;
  return negate ? neg(hit) : hit;
}

const exactCos = (q) => exactSin(q.add(R(1, 2)));

/** If `e` is a rational multiple of pi, return that rational. */
function piMultiple(e) {
  if (key(e) === key(PI)) return R(1);
  if (isZero(e)) return R(0);
  if (e.k === 'mul' && e.args.length === 2 && isNum(e.args[0]) && key(e.args[1]) === key(PI)) {
    return e.args[0].r;
  }
  return null;
}

/* ============================== function evaluation ============================== */

const FLOAT_ONLY = {
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  arcsinh: Math.asinh, arccosh: Math.acosh, arctanh: Math.atanh,
};

/** Build fn(name, args), collapsing to an exact value when one exists. */
export function applyFn(name, args) {
  const a = args[0];

  switch (name) {
    case 'abs':
      if (isNum(a)) return Num(a.r.abs());
      break;

    case 'sqrt':
      return sqrt(a);

    case 'exp':
      if (isZero(a)) return ONE;
      return pow(E, a);

    case 'ln':
      if (isOne(a)) return ZERO;
      if (key(a) === key(E)) return ONE;
      if (a.k === 'pow' && key(a.b) === key(E)) return a.e;
      break;

    case 'log': {
      if (args.length === 2) return div(applyFn('ln', [args[1]]), applyFn('ln', [args[0]]));
      if (isNum(a) && a.r.isInt && a.r.n > 0n) {
        // exact only for powers of ten
        let v = a.r.n;
        let p = 0;
        while (v % 10n === 0n) { v /= 10n; p += 1; }
        if (v === 1n) return Num(p);
      }
      break;
    }

    case 'sin': case 'cos': case 'tan': {
      const arg = settings.angle === 'RAD' ? a : mul(a, div(PI, Num(settings.angle === 'DEG' ? 180 : 200)));
      const q = piMultiple(arg);
      if (q) {
        if (name === 'sin') { const v = exactSin(q); if (v) return v; }
        if (name === 'cos') { const v = exactCos(q); if (v) return v; }
        if (name === 'tan') {
          const s = exactSin(q);
          const c = exactCos(q);
          if (s && c) {
            if (isZero(c)) throw new Error('Undefined');
            return div(s, c);
          }
        }
      }
      if (isZero(a) && name !== 'cos') return ZERO;
      if (isZero(a) && name === 'cos') return ONE;
      break;
    }

    case 'floor': if (isNum(a)) return Num(bigFloor(a.r)); break;
    case 'ceiling': if (isNum(a)) return Num(-bigFloor(a.r.neg())); break;
    case 'sign': if (isNum(a)) return Num(a.r.sign); break;

    default:
      break;
  }

  if (FLOAT_ONLY[name] && isNum(a)) return Num(Rat.fromNumber(FLOAT_ONLY[name](a.r.toNumber())));
  return Fn(name, args);
}

function bigFloor(r) {
  if (r.isInt) return r.n;
  const q = r.n / r.d;
  return r.n < 0n ? q - 1n : q;
}

/* ============================== differentiation ============================== */

const DERIV = {
  sin: (u) => applyFn('cos', [u]),
  cos: (u) => neg(applyFn('sin', [u])),
  tan: (u) => add(ONE, pow(applyFn('tan', [u]), Num(2))),
  ln: (u) => div(ONE, u),
  arcsin: (u) => div(ONE, sqrt(sub(ONE, pow(u, Num(2))))),
  arccos: (u) => neg(div(ONE, sqrt(sub(ONE, pow(u, Num(2)))))),
  arctan: (u) => div(ONE, add(ONE, pow(u, Num(2)))),
  sinh: (u) => applyFn('cosh', [u]),
  cosh: (u) => applyFn('sinh', [u]),
  tanh: (u) => sub(ONE, pow(applyFn('tanh', [u]), Num(2))),
};

export function diff(e, name, order = 1) {
  let out = e;
  for (let i = 0; i < order; i += 1) out = diff1(out, name);
  return out;
}

function diff1(e, name) {
  switch (e.k) {
    case 'num': return ZERO;
    case 'sym': return e.name === name ? ONE : ZERO;
    case 'add': return add(...e.args.map((a) => diff1(a, name)));

    case 'mul':
      // product rule across all factors
      return add(
        ...e.args.map((f, i) =>
          mul(diff1(f, name), ...e.args.filter((_, j) => j !== i))
        )
      );

    case 'pow': {
      const u = e.b;
      const v = e.e;
      const du = diff1(u, name);
      if (!containsSym(v, name)) {
        if (isZero(du)) return ZERO;
        return mul(v, pow(u, sub(v, ONE)), du);
      }
      // general: u^v * (v' ln u + v u'/u)
      const dv = diff1(v, name);
      return mul(pow(u, v), add(mul(dv, applyFn('ln', [u])), div(mul(v, du), u)));
    }

    case 'fn': {
      const u = e.args[0];
      const du = diff1(u, name);
      if (isZero(du)) return ZERO;
      const rule = DERIV[e.name];
      if (rule) return mul(rule(u), du);
      if (e.name === 'sqrt') return div(du, mul(Num(2), sqrt(u)));
      if (e.name === 'exp') return mul(pow(E, u), du);
      if (e.name === 'abs') return mul(applyFn('sign', [u]), du);
      return Fn('d', [e, Sym(name)]); // unknown function: leave it
    }

    case 'list': return List(e.items.map((i) => diff1(i, name)));
    default: return ZERO;
  }
}

/* ============================== integration ============================== */

/** Match a*x + b in the variable `name`; returns [a, b] as expressions or null. */
function linearIn(e, name) {
  const c = polyCoeffs(e, name);
  if (!c || c.length > 2) return null;
  return [Num(c[1] ?? R(0)), Num(c[0])];
}

export function integrate(e, name) {
  const x = Sym(name);

  if (!containsSym(e, name)) return mul(e, x);

  if (e.k === 'add') return add(...e.args.map((a) => integrate(a, name)));

  if (e.k === 'mul') {
    // pull out constant factors
    const consts = e.args.filter((f) => !containsSym(f, name));
    const rest = e.args.filter((f) => containsSym(f, name));
    if (consts.length) return mul(...consts, integrate(rest.length === 1 ? rest[0] : mul(...rest), name));
  }

  // polynomial: integrate term by term, exactly
  const co = polyCoeffs(e, name);
  if (co) {
    return add(...co.map((c, i) => mul(Num(c.div(R(i + 1))), pow(x, Num(i + 1)))));
  }

  // (ax+b)^n
  if (e.k === 'pow' && !containsSym(e.e, name)) {
    const lin = linearIn(e.b, name);
    if (lin && !isZero(lin[0])) {
      const [a] = lin;
      if (isNum(e.e) && e.e.r.eq(R(-1))) return div(applyFn('ln', [e.b]), a);
      const np1 = add(e.e, ONE);
      return div(pow(e.b, np1), mul(a, np1));
    }
    // e^(ax+b)
    if (key(e.b) === key(E)) {
      const lin2 = linearIn(e.e, name);
      if (lin2 && !isZero(lin2[0])) return div(e, lin2[0]);
    }
  }

  if (e.k === 'fn') {
    const lin = linearIn(e.args[0], name);
    if (lin && !isZero(lin[0])) {
      const [a] = lin;
      const u = e.args[0];
      if (e.name === 'sin') return div(neg(applyFn('cos', [u])), a);
      if (e.name === 'cos') return div(applyFn('sin', [u]), a);
      if (e.name === 'exp') return div(applyFn('exp', [u]), a);
      if (e.name === 'ln') return div(sub(mul(u, applyFn('ln', [u])), u), a);
    }
  }

  return Fn('∫', [e, x]); // leave it unevaluated, as TI does
}

/* ============================== factoring ============================== */

/**
 * Factor a univariate polynomial over the rationals.
 * Pulls out the content, splits off every rational root, and keeps any
 * irreducible quadratic as-is -- which is what factor() does on the handheld.
 */
export function factorPoly(e, name) {
  let co = polyCoeffs(e, name);
  if (!co || co.length < 2) return null;

  const x = Sym(name);
  const factors = [];

  // content: rational gcd of the coefficients
  let content = co.reduce((g, c) => ratGcd(g, c), R(0));
  if (content.n === 0n) return null;
  if (co[co.length - 1].sign < 0) content = content.neg();
  co = co.map((c) => c.div(content));

  // x^m
  let m = 0;
  while (co.length > 1 && co[0].n === 0n) { co.shift(); m += 1; }
  if (m > 0) factors.push(pow(x, Num(m)));

  // rational roots
  let guard = 0;
  while (co.length > 2 && guard < 64) {
    guard += 1;
    const roots = rationalRoots(co);
    if (!roots.length) break;
    const r = roots[0];
    // (x - r), scaled to integer coefficients: (d*x - n)
    factors.push(r.d === 1n ? sub(x, Num(r)) : sub(mul(Num(new Rat(r.d)), x), Num(new Rat(r.n))));
    co = deflate(co, r);
    if (r.d !== 1n) co = co.map((c) => c.div(new Rat(r.d)));
  }

  if (co.length === 2) {
    // a*x + b
    const [b, a] = co;
    factors.push(add(mul(Num(a), x), Num(b)));
    co = [R(1)];
  }

  const leftover = co.length > 1 ? polyToExpr(co, name) : null;
  if (leftover) factors.push(leftover);

  const constPart = content.mul(co.length > 1 ? R(1) : co[0]);
  const out = [];
  if (!(constPart.n === 1n && constPart.d === 1n)) out.push(Num(constPart));
  out.push(...factors);
  if (!out.length) return ONE;
  return mul(...out);
}

function ratGcd(a, b) {
  if (a.n === 0n) return b.abs();
  if (b.n === 0n) return a.abs();
  // gcd of numerators over lcm of denominators
  const n = bigGcd(a.n < 0n ? -a.n : a.n, b.n < 0n ? -b.n : b.n);
  const d = (a.d * b.d) / bigGcd(a.d, b.d);
  return new Rat(n, d);
}
function bigGcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a < 0n ? -a : a; }

/* ============================== solving ============================== */

/** Roots of `e` in `name`, exact where possible. */
export function zeros(e, name) {
  const co = polyCoeffs(e, name);
  if (co) return polyZeros(co);

  const n = nsolve(e, name);
  return n === null ? [] : [Num(Rat.fromNumber(n))];
}

function polyZeros(co) {
  const out = [];
  let c = co.slice();

  while (c.length > 1 && c[0].n === 0n) { c.shift(); out.push(ZERO); }

  // peel off rational roots
  let guard = 0;
  while (c.length > 3 && guard < 64) {
    guard += 1;
    const roots = rationalRoots(c);
    if (!roots.length) break;
    out.push(Num(roots[0]));
    c = deflate(c, roots[0]);
  }

  if (c.length === 2) {
    out.push(Num(c[0].neg().div(c[1])));
  } else if (c.length === 3) {
    const [cc, b, a] = c;
    const disc = b.mul(b).sub(R(4).mul(a).mul(cc));
    const twoA = Num(R(2).mul(a));
    const root = sqrt(Num(disc));
    out.push(div(add(Num(b.neg()), root), twoA));
    out.push(div(sub(Num(b.neg()), root), twoA));
  } else if (c.length > 3) {
    // no exact route left: fall back to numeric roots
    for (const r of numericPolyRoots(c)) out.push(Num(Rat.fromNumber(r)));
  }

  // de-duplicate, then sort ascending the way the handheld lists roots
  const seen = new Set();
  const uniq = out.filter((v) => {
    const kk = key(v);
    if (seen.has(kk)) return false;
    seen.add(kk);
    return true;
  });
  return uniq.sort((a, b) => {
    const x = evalNum(a);
    const y = evalNum(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    return x - y;
  });
}

/** Solve an equation or expression; returns a list of `name = value` relations. */
export function solve(e, name) {
  const expr = e.k === 'rel' ? sub(e.l, e.r) : e;
  const roots = zeros(expr, name);
  return roots.map((r) => Rel('=', Sym(name), r));
}

/* ------------------------------ numerics ------------------------------ */

export function evalNum(e, env = {}) {
  switch (e.k) {
    case 'num': return e.r.toNumber();
    case 'sym': {
      if (e.name === PI.name) return Math.PI;
      if (e.name === E.name) return Math.E;
      if (e.name in env) return env[e.name];
      return NaN;
    }
    case 'add': return e.args.reduce((s, a) => s + evalNum(a, env), 0);
    case 'mul': return e.args.reduce((s, a) => s * evalNum(a, env), 1);
    case 'pow': return Math.pow(evalNum(e.b, env), evalNum(e.e, env));
    case 'fn': {
      const v = e.args.map((a) => evalNum(a, env));
      const f = NUMERIC[e.name];
      return f ? f(...v) : NaN;
    }
    default: return NaN;
  }
}

const NUMERIC = {
  sin: (x) => Math.sin(toRad(x)), cos: (x) => Math.cos(toRad(x)), tan: (x) => Math.tan(toRad(x)),
  arcsin: (x) => fromRad(Math.asin(x)), arccos: (x) => fromRad(Math.acos(x)), arctan: (x) => fromRad(Math.atan(x)),
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  ln: Math.log, log: Math.log10, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs,
  floor: Math.floor, ceiling: Math.ceil, sign: Math.sign,
};

function toRad(x) {
  if (settings.angle === 'DEG') return (x * Math.PI) / 180;
  if (settings.angle === 'GRAD') return (x * Math.PI) / 200;
  return x;
}
function fromRad(x) {
  if (settings.angle === 'DEG') return (x * 180) / Math.PI;
  if (settings.angle === 'GRAD') return (x * 200) / Math.PI;
  return x;
}

/** Newton's method with a bisection fallback. */
export function nsolve(e, name, guess = 0) {
  const expr = e.k === 'rel' ? sub(e.l, e.r) : e;
  const f = (v) => evalNum(expr, { [name]: v });
  const d = diff(expr, name);
  const fp = (v) => evalNum(d, { [name]: v });

  let x = guess;
  for (let i = 0; i < 80; i += 1) {
    const y = f(x);
    if (!Number.isFinite(y)) break;
    if (Math.abs(y) < 1e-13) return cleanNum(x);
    const dy = fp(x);
    if (!Number.isFinite(dy) || Math.abs(dy) < 1e-14) break;
    const nx = x - y / dy;
    if (!Number.isFinite(nx)) break;
    if (Math.abs(nx - x) < 1e-14) return cleanNum(nx);
    x = nx;
  }

  // scan for a sign change, then bisect
  for (let lo = -50; lo < 50; lo += 0.5) {
    const a = f(lo);
    const b = f(lo + 0.5);
    if (Number.isFinite(a) && Number.isFinite(b) && a * b < 0) {
      let l = lo;
      let r = lo + 0.5;
      for (let i = 0; i < 200; i += 1) {
        const mid = (l + r) / 2;
        if (f(l) * f(mid) <= 0) r = mid; else l = mid;
      }
      return cleanNum((l + r) / 2);
    }
  }
  return null;
}

function cleanNum(v) {
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-11 ? r : v;
}

function numericPolyRoots(co) {
  // Durand-Kerner, real roots only
  const n = co.length - 1;
  const a = co.map((c) => c.toNumber());
  const lead = a[n];
  const norm = a.map((v) => v / lead);
  let z = [];
  for (let i = 0; i < n; i += 1) {
    const ang = (2 * Math.PI * i) / n + 0.4;
    z.push({ re: Math.cos(ang) * 1.3, im: Math.sin(ang) * 1.3 });
  }
  const evalC = (p) => {
    let re = 0;
    let im = 0;
    for (let i = n; i >= 0; i -= 1) {
      const nr = re * p.re - im * p.im + norm[i];
      im = re * p.im + im * p.re;
      re = nr;
    }
    return { re, im };
  };
  for (let it = 0; it < 500; it += 1) {
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
      const p = evalC(z[i]);
      const den = dr * dr + di * di;
      if (den < 1e-300) continue;
      z[i] = { re: z[i].re - (p.re * dr + p.im * di) / den, im: z[i].im - (p.im * dr - p.re * di) / den };
    }
  }
  return z.filter((p) => Math.abs(p.im) < 1e-8).map((p) => cleanNum(p.re)).sort((p, q) => p - q);
}

/* ============================== limits ============================== */

export function limit(e, name, at) {
  const sub0 = (node) => substitute(node, name, at);
  let num = e;
  for (let i = 0; i < 8; i += 1) {
    const v = sub0(num);
    const n = evalNum(v);
    if (Number.isFinite(n)) return simplifyNumeric(v, n);
    // 0/0 or inf/inf: try L'Hopital on an explicit quotient
    const q = asQuotient(num);
    if (!q) break;
    num = div(diff(q[0], name), diff(q[1], name));
  }
  return Fn('limit', [e, Sym(name), at]);
}

function simplifyNumeric(v, n) {
  return Number.isInteger(n) ? Num(n) : v;
}

function asQuotient(e) {
  if (e.k !== 'mul') return null;
  const den = e.args.filter((f) => f.k === 'pow' && isNum(f.e) && f.e.r.sign < 0);
  if (!den.length) return null;
  const numArgs = e.args.filter((f) => !den.includes(f));
  const d = mul(...den.map((f) => pow(f.b, neg(f.e))));
  return [numArgs.length ? mul(...numArgs) : ONE, d];
}

export function substitute(e, name, value) {
  switch (e.k) {
    case 'sym': return e.name === name ? value : e;
    case 'add': return add(...e.args.map((a) => substitute(a, name, value)));
    case 'mul': return mul(...e.args.map((a) => substitute(a, name, value)));
    case 'pow': return pow(substitute(e.b, name, value), substitute(e.e, name, value));
    case 'fn': return applyFn(e.name, e.args.map((a) => substitute(a, name, value)));
    case 'list': return List(e.items.map((a) => substitute(a, name, value)));
    case 'rel': return Rel(e.op, substitute(e.l, name, value), substitute(e.r, name, value));
    default: return e;
  }
}
