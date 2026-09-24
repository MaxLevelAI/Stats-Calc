// Symbolic core.
//
// Expressions are canonical trees that simplify as they are built, which is
// what lets 1/3+1/6 collapse to 1/2 and x+x to 2*x without a separate pass.
//
//   {k:'num', r:Rat}                exact rational
//   {k:'sym', name}                 free variable
//   {k:'add', args:[...]}           sum, flattened, like terms combined
//   {k:'mul', args:[...]}           product, flattened, like bases combined
//   {k:'pow', b, e}
//   {k:'fn', name, args:[...]}      sin, ln, abs, ...
//   {k:'list', items:[...]}
//   {k:'rel', op, l, r}             =, <, >, <=, >=, !=

import { Rat, gcd, abs as babs } from './rational.js';

/* ============================== constructors ============================== */

export const Num = (v) => ({ k: 'num', r: Rat.from(v) });
export const Sym = (name) => ({ k: 'sym', name });
export const List = (items) => ({ k: 'list', items });
export const Rel = (op, l, r) => ({ k: 'rel', op, l, r });

export const ZERO = Num(0);
export const ONE = Num(1);
export const MONE = Num(-1);

export const isNum = (e) => e.k === 'num';
export const isZero = (e) => e.k === 'num' && e.r.n === 0n;
export const isOne = (e) => e.k === 'num' && e.r.n === 1n && e.r.d === 1n;
export const isUndef = (e) => e.k === 'sym' && e.name === 'undef';

/* ------------------------------ canonical key ------------------------------ */

export function key(e) {
  switch (e.k) {
    case 'num': return 'n' + e.r.toString();
    case 'sym': return 's' + e.name;
    case 'add': return 'a(' + e.args.map(key).join(',') + ')';
    case 'mul': return 'm(' + e.args.map(key).join(',') + ')';
    case 'pow': return 'p(' + key(e.b) + ',' + key(e.e) + ')';
    case 'fn': return 'f' + e.name + '(' + e.args.map(key).join(',') + ')';
    case 'list': return 'l(' + e.items.map(key).join(',') + ')';
    case 'rel': return 'r' + e.op + '(' + key(e.l) + ',' + key(e.r) + ')';
    default: return '?';
  }
}

/** Total polynomial-ish degree, used only to order terms for display. */
function degree(e) {
  switch (e.k) {
    case 'num': return 0;
    case 'sym': return 1;
    case 'add': return Math.max(...e.args.map(degree), 0);
    case 'mul': return e.args.reduce((s, a) => s + degree(a), 0);
    case 'pow': return isNum(e.e) && e.e.r.isInt ? degree(e.b) * Number(e.e.r.n) : degree(e.b);
    case 'fn': return 1;
    default: return 0;
  }
}

/* ------------------------------ add ------------------------------ */

/** Split a term into [numeric coefficient, remaining factor]. */
function splitCoeff(e) {
  if (isNum(e)) return [e.r, ONE];
  if (e.k === 'mul') {
    const nums = e.args.filter(isNum);
    const rest = e.args.filter((a) => !isNum(a));
    const c = nums.reduce((acc, n) => acc.mul(n.r), Rat.from(1));
    return [c, rest.length === 0 ? ONE : rest.length === 1 ? rest[0] : { k: 'mul', args: rest }];
  }
  return [Rat.from(1), e];
}

export function add(...parts) {
  const flat = [];
  const push = (e) => {
    if (e.k === 'add') e.args.forEach(push);
    else flat.push(e);
  };
  parts.forEach(push);
  if (flat.some(isUndef)) return UNDEF;

  let c = Rat.from(0);
  const groups = new Map(); // key -> { coeff, node }
  for (const t of flat) {
    if (isNum(t)) { c = c.add(t.r); continue; }
    const [coef, rest] = splitCoeff(t);
    const kk = key(rest);
    const g = groups.get(kk);
    if (g) g.coeff = g.coeff.add(coef);
    else groups.set(kk, { coeff: coef, node: rest });
  }

  const terms = [];
  for (const { coeff, node } of groups.values()) {
    if (coeff.n === 0n) continue;
    terms.push(coeff.n === 1n && coeff.d === 1n ? node : mul(Num(coeff), node));
  }
  if (c.n !== 0n) terms.push(Num(c));

  if (terms.length === 0) return ZERO;
  if (terms.length === 1) return terms[0];

  terms.sort((a, b) => degree(b) - degree(a) || key(a).localeCompare(key(b)));
  return { k: 'add', args: terms };
}

export const sub = (a, b) => add(a, neg(b));
export const neg = (a) => mul(MONE, a);

/* ------------------------------ mul ------------------------------ */

/** Split a factor into [base, exponent]. */
function splitPow(e) {
  if (e.k === 'pow') return [e.b, e.e];
  return [e, ONE];
}

export function mul(...parts) {
  const flat = [];
  const push = (e) => {
    if (e.k === 'mul') e.args.forEach(push);
    else flat.push(e);
  };
  parts.forEach(push);

  if (flat.some(isUndef)) return UNDEF;

  let c = Rat.from(1);
  const groups = new Map(); // key(base) -> { base, exp }
  for (const f of flat) {
    if (isZero(f)) return ZERO;
    if (isNum(f)) { c = c.mul(f.r); continue; }
    const [b, e] = splitPow(f);
    const kk = key(b);
    const g = groups.get(kk);
    if (g) g.exp = add(g.exp, e);
    else groups.set(kk, { base: b, exp: e });
  }
  if (c.n === 0n) return ZERO;

  const factors = [];
  for (const { base, exp } of groups.values()) {
    const p = pow(base, exp);
    if (isOne(p)) continue;
    if (isNum(p)) { c = c.mul(p.r); continue; }
    factors.push(p);
  }

  if (factors.length === 0) return Num(c);
  if (c.n !== 1n || c.d !== 1n) factors.unshift(Num(c));
  if (factors.length === 1) return factors[0];

  // numbers first, then powers of symbols, then everything else -- this is
  // the order the handheld prints products in (x^2*cos(x), not cos(x)*x^2).
  const rank = (e) =>
    (isNum(e) ? 0 : e.k === 'sym' || (e.k === 'pow' && e.b.k === 'sym') ? 1 : 2);
  factors.sort((a, b) => rank(a) - rank(b) || key(a).localeCompare(key(b)));
  return { k: 'mul', args: factors };
}

export const div = (a, b) => mul(a, pow(b, MONE));

/* ------------------------------ pow ------------------------------ */

/**
 * Split n (a non-negative BigInt) as outside^r * inside, pulling perfect r-th
 * powers out of the radical: sqrt(12) -> 2*sqrt(3).
 */
function simplifyRadical(n, rootIndex) {
  const R = BigInt(rootIndex);
  let outside = 1n;
  let inside = 1n;
  let m = n;
  for (let p = 2n; p * p <= m && p < 100000n; p += 1n) {
    if (m % p !== 0n) continue;
    let e = 0n;
    while (m % p === 0n) { m /= p; e += 1n; }
    outside *= p ** (e / R);
    inside *= p ** (e % R);
  }
  if (m > 1n) inside *= m;
  return [outside, inside];
}

export const UNDEF = { k: 'sym', name: 'undef' };

export function pow(b, e) {
  if (isZero(e)) return ONE;
  if (isOne(e)) return b;
  if (isOne(b)) return ONE;
  if (isZero(b)) {
    // 0^negative is undefined -- returning 0 here silently breaks limits,
    // because substituting into a quotient would collapse it to zero.
    if (isNum(e) && e.r.sign < 0) return UNDEF;
    return ZERO;
  }

  if (isNum(b) && isNum(e)) {
    const exact = b.r.pow(e.r);
    if (exact) return Num(exact);

    // Rational exponent on a positive rational base: take the integer power
    // exactly, then pull perfect roots out and rationalise the denominator so
    // sqrt(1/2) comes back as sqrt(2)/2, the way a CAS prints it.
    const q = Number(e.r.d);
    if (e.r.d !== 1n && b.r.sign > 0 && q <= 8) {
      const raised = b.r.pow(new Rat(e.r.n, 1n));
      if (raised) {
        const R = e.r.d;
        let [outN, inN] = simplifyRadical(raised.n, q);
        let [outD, inD] = simplifyRadical(raised.d, q);
        if (inD !== 1n) {
          // inN^(1/q) / inD^(1/q) = (inN * inD^(q-1))^(1/q) / inD
          const merged = inN * inD ** (R - 1n);
          const [o2, i2] = simplifyRadical(merged, q);
          outN *= o2;
          inN = i2;
          outD *= inD;
          inD = 1n;
        }
        const outside = new Rat(outN, outD);
        const inside = new Rat(inN, inD);
        if (inside.n === 1n && inside.d === 1n) return Num(outside);
        const radical = { k: 'pow', b: Num(inside), e: Num(new Rat(1n, R)) };
        return outside.n === 1n && outside.d === 1n ? radical : mul(Num(outside), radical);
      }
    }
    return { k: 'pow', b, e };
  }

  // (a*b)^n  ->  a^n * b^n   for integer n
  if (b.k === 'mul' && isNum(e) && e.r.isInt) return mul(...b.args.map((a) => pow(a, e)));

  // (a^m)^n  ->  a^(m*n)  when safe
  if (b.k === 'pow' && isNum(e) && e.r.isInt) return pow(b.b, mul(b.e, e));

  return { k: 'pow', b, e };
}

export const sqrt = (x) => pow(x, Num(new Rat(1n, 2n)));

/* ============================== expand ============================== */

export function expand(e) {
  switch (e.k) {
    case 'add':
      return add(...e.args.map(expand));

    case 'mul': {
      const parts = e.args.map(expand);
      let acc = [ONE];
      for (const p of parts) {
        const terms = p.k === 'add' ? p.args : [p];
        const next = [];
        for (const a of acc) for (const t of terms) next.push(mul(a, t));
        acc = next;
      }
      return add(...acc);
    }

    case 'pow': {
      const b = expand(e.b);
      if (b.k === 'add' && isNum(e.e) && e.e.r.isInt && e.e.r.n > 0n && e.e.r.n <= 16n) {
        // Distribute directly. Going back through expand() would not work:
        // mul(b, b) canonicalises straight back to b^2 and we would recurse.
        let acc = [ONE];
        for (let i = 0n; i < e.e.r.n; i += 1n) {
          const next = [];
          for (const a of acc) for (const term of b.args) next.push(mul(a, term));
          if (next.length > 20000) return pow(b, e.e); // refuse to blow up
          acc = next;
        }
        return add(...acc);
      }
      return pow(b, expand(e.e));
    }

    case 'fn':
      return { k: 'fn', name: e.name, args: e.args.map(expand) };

    case 'list':
      return List(e.items.map(expand));

    case 'rel':
      return Rel(e.op, expand(e.l), expand(e.r));

    default:
      return e;
  }
}

/* ============================== polynomials ============================== */

/**
 * Coefficients of e as a polynomial in x, lowest power first.
 * Returns null when e is not a polynomial in x.
 */
export function polyCoeffs(e, x) {
  const name = typeof x === 'string' ? x : x.name;

  const addPoly = (A, B) => {
    const out = [];
    for (let i = 0; i < Math.max(A.length, B.length); i += 1) {
      out.push((A[i] ?? Rat.from(0)).add(B[i] ?? Rat.from(0)));
    }
    return out;
  };
  const mulPoly = (A, B) => {
    const out = new Array(A.length + B.length - 1).fill(null).map(() => Rat.from(0));
    for (let i = 0; i < A.length; i += 1) {
      for (let j = 0; j < B.length; j += 1) out[i + j] = out[i + j].add(A[i].mul(B[j]));
    }
    return out;
  };

  function go(node) {
    switch (node.k) {
      case 'num': return [node.r];
      case 'sym': return node.name === name ? [Rat.from(0), Rat.from(1)] : null;
      case 'add': {
        let acc = [Rat.from(0)];
        for (const a of node.args) {
          const p = go(a);
          if (!p) return null;
          acc = addPoly(acc, p);
        }
        return acc;
      }
      case 'mul': {
        let acc = [Rat.from(1)];
        for (const a of node.args) {
          const p = go(a);
          if (!p) return null;
          acc = mulPoly(acc, p);
        }
        return acc;
      }
      case 'pow': {
        if (!isNum(node.e) || !node.e.r.isInt || node.e.r.n < 0n || node.e.r.n > 64n) return null;
        const base = go(node.b);
        if (!base) return null;
        let acc = [Rat.from(1)];
        for (let i = 0n; i < node.e.r.n; i += 1n) acc = mulPoly(acc, base);
        return acc;
      }
      default:
        return null;
    }
  }

  const p = go(expand(e));
  if (!p) return null;
  while (p.length > 1 && p[p.length - 1].n === 0n) p.pop();
  return p;
}

export function containsSym(e, name) {
  switch (e.k) {
    case 'sym': return e.name === name;
    case 'add': case 'mul': return e.args.some((a) => containsSym(a, name));
    case 'pow': return containsSym(e.b, name) || containsSym(e.e, name);
    case 'fn': return e.args.some((a) => containsSym(a, name));
    case 'list': return e.items.some((a) => containsSym(a, name));
    case 'rel': return containsSym(e.l, name) || containsSym(e.r, name);
    default: return false;
  }
}

/** Free variables, in first-seen order. */
export function freeVars(e, out = []) {
  switch (e.k) {
    case 'sym': if (!out.includes(e.name)) out.push(e.name); break;
    case 'add': case 'mul': e.args.forEach((a) => freeVars(a, out)); break;
    case 'pow': freeVars(e.b, out); freeVars(e.e, out); break;
    case 'fn': e.args.forEach((a) => freeVars(a, out)); break;
    case 'list': e.items.forEach((a) => freeVars(a, out)); break;
    case 'rel': freeVars(e.l, out); freeVars(e.r, out); break;
    default: break;
  }
  return out;
}

/** Build an expression back from coefficients (lowest power first). */
export function polyToExpr(coeffs, name) {
  const x = Sym(name);
  return add(...coeffs.map((c, i) => mul(Num(c), pow(x, Num(i)))));
}

/* ------------------------------ rational roots ------------------------------ */

/** Scale a rational coefficient list to integers; returns [ints, scale]. */
function toIntegerPoly(coeffs) {
  let den = 1n;
  for (const c of coeffs) den = (den * c.d) / gcd(den, c.d);
  const ints = coeffs.map((c) => (c.n * den) / c.d);
  let g = 0n;
  for (const v of ints) g = gcd(g, babs(v));
  if (g > 1n) return [ints.map((v) => v / g), new Rat(g, den)];
  return [ints, new Rat(1n, den)];
}

function divisors(n) {
  n = babs(n);
  const out = [];
  for (let i = 1n; i * i <= n && i < 100000n; i += 1n) {
    if (n % i === 0n) { out.push(i); if (i !== n / i) out.push(n / i); }
  }
  return out;
}

/** All rational roots of a polynomial, via the rational root theorem. */
export function rationalRoots(coeffs) {
  const [ints] = toIntegerPoly(coeffs);
  if (ints.length < 2) return [];
  const a0 = ints[0];
  const an = ints[ints.length - 1];
  if (an === 0n) return [];

  const roots = [];
  const seen = new Set();
  const cands = [];
  if (a0 === 0n) cands.push(new Rat(0n));
  for (const p of divisors(a0 === 0n ? 1n : a0)) {
    for (const q of divisors(an)) {
      cands.push(new Rat(p, q), new Rat(-p, q));
    }
  }
  for (const c of cands) {
    const kk = c.toString();
    if (seen.has(kk)) continue;
    seen.add(kk);
    let acc = Rat.from(0);
    for (let i = coeffs.length - 1; i >= 0; i -= 1) acc = acc.mul(c).add(coeffs[i]);
    if (acc.n === 0n) roots.push(c);
  }
  return roots;
}

/** Synthetic division by (x - r). */
export function deflate(coeffs, r) {
  const out = new Array(coeffs.length - 1);
  let carry = Rat.from(0);
  for (let i = coeffs.length - 1; i >= 1; i -= 1) {
    carry = coeffs[i].add(carry.mul(r));
    out[i - 1] = carry;
  }
  return out;
}
