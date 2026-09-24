// Exact rational arithmetic on BigInt.  The CAS keeps results exact wherever
// it can, which is why 1/3 + 1/6 must come back as 1/2 and not 0.5.

export class Rat {
  constructor(n, d = 1n) {
    if (d === 0n) throw new Error('Divide by zero');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(abs(n), d);
    this.n = g > 1n ? n / g : n;
    this.d = g > 1n ? d / g : d;
  }

  static from(v) {
    if (v instanceof Rat) return v;
    if (typeof v === 'bigint') return new Rat(v);
    if (Number.isInteger(v)) return new Rat(BigInt(v));
    return Rat.fromNumber(v);
  }

  /** Exact decimal -> rational, e.g. 0.25 -> 1/4 (used for typed literals). */
  static fromDecimalString(s) {
    const m = /^(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m) throw new Error('Bad number');
    const whole = m[1] || '0';
    const frac = m[2] || '';
    const n = BigInt(whole + frac);
    const d = 10n ** BigInt(frac.length);
    return new Rat(n, d);
  }

  static fromNumber(x) {
    if (!Number.isFinite(x)) throw new Error('Not a number');
    if (Number.isInteger(x)) return new Rat(BigInt(x));
    // exact binary expansion of the double
    let d = 1n;
    let v = x;
    while (!Number.isInteger(v) && d < 10n ** 30n) { v *= 2; d *= 2n; }
    return new Rat(BigInt(Math.round(v)), d);
  }

  get isInt() { return this.d === 1n; }
  get sign() { return this.n === 0n ? 0 : this.n < 0n ? -1 : 1; }

  add(o) { o = Rat.from(o); return new Rat(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Rat.from(o); return new Rat(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Rat.from(o); return new Rat(this.n * o.n, this.d * o.d); }
  div(o) {
    o = Rat.from(o);
    if (o.n === 0n) throw new Error('Divide by zero');
    return new Rat(this.n * o.d, this.d * o.n);
  }
  neg() { return new Rat(-this.n, this.d); }
  abs() { return new Rat(abs(this.n), this.d); }

  /** Integer powers stay exact; anything else returns null so the caller falls back. */
  pow(o) {
    o = Rat.from(o);
    if (!o.isInt) return null;
    let e = o.n;
    if (e === 0n) return new Rat(1n);
    const inv = e < 0n;
    if (inv) e = -e;
    if (e > 4096n) return null; // refuse to blow up memory
    return inv ? new Rat(this.d ** e, this.n ** e) : new Rat(this.n ** e, this.d ** e);
  }

  cmp(o) {
    o = Rat.from(o);
    const l = this.n * o.d;
    const r = o.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  eq(o) { return this.cmp(o) === 0; }

  toNumber() {
    if (this.isInt && abs(this.n) < 2n ** 53n) return Number(this.n);
    return Number(this.n) / Number(this.d);
  }

  toString() { return this.isInt ? String(this.n) : `${this.n}/${this.d}`; }
}

export function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export function lcm(a, b) {
  if (a === 0n || b === 0n) return 0n;
  return abs(a * b) / gcd(a, b);
}

export function abs(v) { return v < 0n ? -v : v; }

export const ZERO = new Rat(0n);
export const ONE = new Rat(1n);
