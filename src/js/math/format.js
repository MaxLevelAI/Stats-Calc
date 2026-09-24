// Render a symbolic expression the way the handheld prints it:
// middle dot for multiplication, superscript exponents, radicals, and
// negative powers folded into a fraction.

import { isNum, key } from './sym.js';
import { settings } from './cas.js';

const SUP = { '0': '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };

const P_ADD = 1;
const P_MUL = 2;
const P_POW = 3;
const P_ATOM = 4;

const wrap = (s, inner, outer) => (inner < outer ? `(${s})` : s);

function superscript(n) {
  const s = String(n);
  if (!/^-?\d+$/.test(s) || s.length > 3) return null;
  return [...s].map((c) => SUP[c]).join('');
}

/** Is this factor a negative power, i.e. does it belong in the denominator? */
function isInverse(f) {
  return f.k === 'pow' && isNum(f.e) && f.e.r.sign < 0;
}

export function fmt(e, prec = 0) {
  switch (e.k) {
    case 'num': {
      if (e.r.isInt) return String(e.r.n);
      const s = `${e.r.n < 0n ? -e.r.n : e.r.n}/${e.r.d}`;
      return e.r.n < 0n ? wrap(`-${s}`, P_ADD, prec) : wrap(s, P_MUL, prec);
    }

    case 'sym':
      return e.name;

    case 'add': {
      let out = '';
      e.args.forEach((t, i) => {
        const s = fmt(t, P_ADD);
        if (i === 0) { out = s; return; }
        out += s.startsWith('-') ? s : `+${s}`;
      });
      return wrap(out, P_ADD, prec);
    }

    case 'mul': {
      // Split into a rational coefficient, numerator factors and denominator
      // factors, so 1/3*x^3 prints as x^3/3 rather than 1/3*x^3.
      let coeff = null;
      const numF = [];
      const denF = [];
      for (const f of e.args) {
        if (isNum(f) && coeff === null) { coeff = f.r; continue; }
        if (isInverse(f)) {
          const inv = f.e.r.neg();
          denF.push(inv.n === 1n && inv.d === 1n ? f.b : { k: 'pow', b: f.b, e: { k: 'num', r: inv } });
        }
        else numF.push(f);
      }

      let sign = '';
      if (coeff && coeff.sign < 0) { sign = '-'; coeff = coeff.neg(); }

      const ns = numF.map((f) => fmt(f, P_MUL));
      const ds = denF.map((f) => fmt(f, P_MUL));
      if (coeff) {
        if (coeff.n !== 1n || ns.length === 0) ns.unshift(String(coeff.n));
        if (coeff.d !== 1n) ds.unshift(String(coeff.d));
      }

      const top = ns.length ? ns.join('·') : '1';
      if (!ds.length) return wrap(sign + top, P_MUL, prec);
      const bottom = ds.length > 1 ? `(${ds.join('·')})` : ds[0];
      return wrap(`${sign}${top}/${bottom}`, P_MUL, prec);
    }

    // Display-only nodes: a product that must NOT be collapsed, used to show
    // an integer factorisation such as 2^2*3*5.
    case 'rawmul': {
      let parts = e.args;
      let sign = '';
      if (isNum(parts[0]) && parts[0].r.n === -1n && parts[0].r.d === 1n) {
        sign = '-';
        parts = parts.slice(1);
      }
      return wrap(sign + parts.map((a) => fmt(a, P_MUL)).join('·'), P_MUL, prec);
    }

    case 'rawpow': {
      const sup = superscript(e.e);
      const base = fmt(e.b, P_POW);
      return sup ? base + sup : `${base}^${e.e}`;
    }

    case 'pow': {
      // square root and nth root -- only for a genuine 1/d exponent
      if (isNum(e.e) && e.e.r.n === 1n && e.e.r.d !== 1n) {
        if (e.e.r.d === 2n) return `√(${fmt(e.b, 0)})`;
        return `root(${fmt(e.b, 0)},${e.e.r.d})`;
      }
      if (isNum(e.e) && e.e.r.isInt && e.e.r.n === 1n) return fmt(e.b, prec);

      // a bare negative power is a reciprocal: x^-1 prints as 1/x
      if (isNum(e.e) && e.e.r.sign < 0) {
        const inv = { k: 'pow', b: e.b, e: { k: 'num', r: e.e.r.neg() } };
        return wrap(`1/${fmt(inv, P_MUL)}`, P_MUL, prec);
      }

      const base = fmt(e.b, P_POW);
      if (isNum(e.e) && e.e.r.isInt) {
        const sup = superscript(e.e.r.n);
        if (sup) return wrap(base + sup, P_POW, prec);
      }
      return wrap(`${base}^${fmt(e.e, P_POW)}`, P_POW, prec);
    }

    case 'fn': {
      if (e.name === '∫') return `∫(${e.args.map((a) => fmt(a, 0)).join(',')})`;
      return `${e.name}(${e.args.map((a) => fmt(a, 0)).join(',')})`;
    }

    case 'list': {
      // a list whose entries are equal-length lists is a matrix, and TI prints
      // matrices in square brackets rather than braces
      const isMatrix = e.items.length > 0 && e.items.every(
        (r) => r.k === 'list' && r.items.length > 0 && r.items.length === e.items[0].items.length
      );
      if (isMatrix) {
        return `[${e.items.map((r) => `[${r.items.map((v) => fmt(v, 0)).join(',')}]`).join(',')}]`;
      }
      return `{${e.items.map((i) => fmt(i, 0)).join(',')}}`;
    }

    case 'rel':
      return `${fmt(e.l, 0)}${e.op}${fmt(e.r, 0)}`;

    default:
      return '?';
  }
}

/** Decimal rendering, honouring the document's Display Digits setting. */
export function fmtFloat(x) {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'undef' : x > 0 ? '∞' : '-∞';
  if (x === 0) return settings.digits?.fix !== undefined ? (0).toFixed(settings.digits.fix) : '0';

  const d = settings.digits;
  if (d && d.fix !== undefined) return x.toFixed(d.fix);

  const sig = d && d.float !== undefined ? d.float : 12;
  const mag = Math.abs(x);
  if (settings.expo === 'SCI' || mag >= 1e12 || mag < 1e-9) {
    return x.toExponential(Math.max(0, sig - 1)).replace(/\.?0+e/, 'e').replace('e+', 'e');
  }
  let s = x.toPrecision(sig);
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return s;
}
