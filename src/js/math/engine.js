// Expression engine: tokenise -> Pratt-parse -> build a symbolic tree -> format.
//
// Results stay exact the way a CAS handheld's do: 1/3+1/6 is 1/2, sqrt(12) is
// 2*sqrt(3), sin(pi/6) is 1/2, and x+x is 2*x. Typing a decimal anywhere makes
// the whole result approximate, which is also how the handheld behaves.

import { Rat } from './rational.js';
import * as S from './sym.js';
import * as C from './cas.js';
import * as D from './dist.js';
import { COMMANDS, COMMAND_IMPL } from './commands.js';
import { fmt, fmtFloat } from './format.js';

export const settings = C.settings; // { angle: 'RAD' | 'DEG' | 'GRAD' }

/** User variables, cleared by ClearAZ / DelVar. */
export const vars = new Map();

/** The previous result, reachable as `ans` (ctrl + (-) on the keypad). */
let lastAns = null;
export const getAns = () => lastAns;

/* ============================== lexer ============================== */

const OPCHARS = '+-*/^()=<>!,{}[]×·÷−≠≤≥√πℯ→';

function lex(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i += 1; continue; }

    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      if (src[j] === '.') { j += 1; while (j < src.length && /[0-9]/.test(src[j])) j += 1; }
      const text = src.slice(i, j);
      let exp = null;
      if (src[j] === 'E') {
        let k2 = j + 1;
        if (src[k2] === '+' || src[k2] === '-' || src[k2] === '−') k2 += 1;
        if (/[0-9]/.test(src[k2] || '')) {
          while (k2 < src.length && /[0-9]/.test(src[k2])) k2 += 1;
          exp = src.slice(j + 1, k2).replace('−', '-');
          j = k2;
        }
      }
      out.push({ t: 'num', text, exp });
      i = j;
      continue;
    }

    if (c === '"') {
      let j = i + 1;
      let text = '';
      while (j < src.length && src[j] !== '"') { text += src[j]; j += 1; }
      if (src[j] !== '"') throw new Error('Missing "');
      out.push({ t: 'str', text });
      i = j + 1;
      continue;
    }

    if (/[A-Za-z_α-ωχ]/.test(c)) {
      let j = i;
      const wordChar = (ch) => /[A-Za-z0-9_α-ωχ²̂]/.test(ch);
      while (j < src.length) {
        if (wordChar(src[j])) { j += 1; continue; }
        // a dot continues the name only inside a namespace like stat.v
        if (src[j] === '.' && wordChar(src[j + 1] || '')) { j += 1; continue; }
        break;
      }
      out.push({ t: 'id', text: src.slice(i, j) });
      i = j;
      continue;
    }

    if (c === '≤' || c === '≥' || c === '≠') { out.push({ t: 'op', text: c }); i += 1; continue; }
    if (c === '<' || c === '>') {
      if (src[i + 1] === '=') { out.push({ t: 'op', text: c + '=' }); i += 2; continue; }
      out.push({ t: 'op', text: c }); i += 1; continue;
    }
    if (c === ':' && src[i + 1] === '=') { out.push({ t: 'op', text: ':=' }); i += 2; continue; }
    if (OPCHARS.includes(c)) { out.push({ t: 'op', text: c }); i += 1; continue; }

    throw new Error('Invalid character');
  }
  out.push({ t: 'end', text: '' });
  return out;
}

/* ============================== parser ============================== */

const BP = {
  ':=': 3, '→': 3,
  '=': 5, '≠': 5, '<': 5, '>': 5, '<=': 5, '>=': 5, '≤': 5, '≥': 5,
  '+': 10, '-': 10, '−': 10,
  '*': 20, '/': 20, '×': 20, '·': 20, '÷': 20,
  '^': 40,
};

function parse(tokens, state) {
  let p = 0;
  const peek = () => tokens[p];
  const next = () => tokens[p++];
  const at = (text) => peek().t === 'op' && peek().text === text;
  const expect = (text) => { if (!at(text)) throw new Error('Syntax error'); next(); };

  function args(close) {
    const out = [];
    if (!at(close)) {
      out.push(expr(0));
      while (at(',')) { next(); out.push(expr(0)); }
    }
    expect(close);
    return out;
  }

  function primary() {
    const tk = next();

    if (tk.t === 'num') {
      let v = Rat.fromDecimalString(tk.text);
      if (tk.text.includes('.')) state.approx = true;
      if (tk.exp != null) {
        const e = BigInt(tk.exp);
        v = e >= 0n ? v.mul(new Rat(10n ** e)) : v.div(new Rat(10n ** -e));
      }
      return { n: 'num', v };
    }

    if (tk.t === 'str') return { n: 'str', s: tk.text };

    if (tk.t === 'id') {
      if (at('(')) { next(); return { n: 'call', name: tk.text, args: args(')') }; }
      // statistics commands take bare comma-separated arguments: OneVar {1,2,3}
      if (COMMANDS.has(tk.text.toLowerCase())) {
        const list = [];
        if (peek().t !== 'end') {
          list.push(expr(0));
          while (at(',')) { next(); list.push(expr(0)); }
        }
        return { n: 'cmd', name: tk.text, args: list };
      }
      return { n: 'var', name: tk.text };
    }

    if (tk.t === 'op') {
      if (tk.text === '(') { const e = expr(0); expect(')'); return e; }
      if (tk.text === '{') return { n: 'list', items: args('}') };
      if (tk.text === '[') return { n: 'list', items: args(']') };
      if (tk.text === '-' || tk.text === '−') return { n: 'neg', a: expr(30) };
      if (tk.text === '+') return expr(30);
      if (tk.text === '√') return { n: 'call', name: 'sqrt', args: [expr(35)] };
      if (tk.text === 'π') return { n: 'var', name: 'π' };
      if (tk.text === 'ℯ') return { n: 'var', name: 'ℯ' };
    }

    throw new Error('Syntax error');
  }

  function postfix(left) {
    for (;;) {
      if (at('!')) { next(); left = { n: 'call', name: 'factorial', args: [left] }; continue; }
      return left;
    }
  }

  function expr(minbp) {
    let left = postfix(primary());
    for (;;) {
      const tk = peek();

      // implicit multiplication: 2x, 3(4+1), 2sin(x)
      if ((tk.t === 'id' || tk.t === 'num' ||
           (tk.t === 'op' && (tk.text === '(' || tk.text === '√' || tk.text === 'π'))) &&
          BP['*'] > minbp) {
        left = { n: 'bin', op: '*', a: left, b: expr(BP['*'] + 1) };
        continue;
      }

      if (tk.t !== 'op') break;
      const bp = BP[tk.text];
      if (bp === undefined || bp <= minbp) break;
      next();
      const rhs = expr(tk.text === '^' ? bp - 1 : bp);
      left = postfix({ n: 'bin', op: tk.text, a: left, b: rhs });
    }
    return left;
  }

  const ast = expr(0);
  if (peek().t !== 'end') throw new Error('Syntax error');
  return ast;
}

/* ============================== AST -> symbolic ============================== */

const CONSTS = {
  pi: C.PI, 'π': C.PI,
  'ℯ': C.E,
  e: C.E,
  infinity: S.Sym('∞'), '∞': S.Sym('∞'),
};

function build(node) {
  switch (node.n) {
    case 'num': return S.Num(node.v);
    case 'str': return { k: 'text', s: node.s };
    case 'list': return S.List(node.items.map(build));
    case 'neg': return S.neg(build(node.a));

    case 'var': {
      const name = node.name;
      if (name === 'ans') {
        if (!lastAns) throw new Error('No previous answer');
        return lastAns;
      }
      if (CONSTS[name]) return CONSTS[name];
      if (vars.has(name)) {
        if (name.startsWith('stat.')) EV.approx = true;
        return vars.get(name);
      }
      return S.Sym(name);
    }

    case 'bin': {
      const op = { '×': '*', '·': '*', '÷': '/', '−': '-' }[node.op] ?? node.op;

      if (op === ':=' || op === '→') {
        const [target, value] = op === ':=' ? [node.a, node.b] : [node.b, node.a];
        if (target.n !== 'var') throw new Error('Invalid assignment');
        const v = build(value);
        vars.set(target.name, v);
        return v;
      }

      const a = build(node.a);
      const b = build(node.b);
      switch (op) {
        case '+': return S.add(a, b);
        case '-': return S.sub(a, b);
        case '*': return S.mul(a, b);
        case '/': return S.div(a, b);
        case '^': return S.pow(a, b);
        default: return S.Rel(op, a, b);
      }
    }

    case 'cmd': {
      const fn = COMMAND_IMPL[node.name.toLowerCase()];
      if (!fn) throw new Error(`"${node.name}" is not defined`);
      return runCommand(fn, node.args.map(build));
    }

    case 'call': {
      const name = node.name;
      const lower = name.toLowerCase();
      const fn = FN[name] ?? FN[lower];
      if (fn) return fn(node.args.map(build), node);
      // an undefined name applied to arguments stays symbolic, like f(x)
      return { k: 'fn', name, args: node.args.map(build) };
    }

    default:
      throw new Error('Syntax error');
  }
}

/* ============================== function library ============================== */

const num = (v) => S.Num(v);
const asNumber = (e) => {
  const v = C.evalNum(e);
  if (!Number.isFinite(v)) throw new Error('Expected a number');
  return v;
};
const asInt = (e) => {
  const v = asNumber(e);
  if (!Number.isInteger(v)) throw new Error('Expected an integer');
  return v;
};
const optNum = (e, dflt) => (e === undefined ? dflt : asNumber(e));
const asList = (e) => (e.k === 'list' ? e.items : [e]);
const nums = (e) => asList(e).map(asNumber);

// Results that are genuinely decimal (nSolve, rand, round, ...) set this, so
// the whole answer renders approximately -- the handheld does the same.
const EV = { approx: false };
const flt = (x) => { EV.approx = true; return S.Num(Rat.fromNumber(x)); };

/** List elements ordered by value, keeping the original exact nodes. */
const sortedNodes = (e) => asList(e).slice().sort((p, q) => C.evalNum(p) - C.evalNum(q));

/** Apply f to each element when handed a list (TI's elementwise semantics). */
const mapUn = (e, f) => (e.k === 'list' ? S.List(e.items.map(f)) : f(e));

function varNameOf(e, fallback = 'x') {
  if (e && e.k === 'sym') return e.name;
  if (e && e.k === 'rel' && e.l.k === 'sym') return e.l.name;
  return fallback;
}

/** The variable to work on when the user did not name one. */
function guessVar(e) {
  const vs = S.freeVars(e).filter((n) => n !== C.PI.name && n !== C.E.name);
  return vs.includes('x') ? 'x' : vs[0] ?? 'x';
}

const FN = {
  /* ---- elementary ---- */
  sqrt: (a) => mapUn(a[0], (v) => S.sqrt(v)),
  abs: (a) => mapUn(a[0], (v) => C.applyFn('abs', [v])),
  exp: (a) => mapUn(a[0], (v) => C.applyFn('exp', [v])),
  ln: (a) => mapUn(a[0], (v) => C.applyFn('ln', [v])),
  log: (a) => (a.length > 1 ? C.applyFn('log', a) : mapUn(a[0], (v) => C.applyFn('log', [v]))),
  root: (a) => S.pow(a[0], S.div(S.Num(1), a[1])),

  sin: (a) => mapUn(a[0], (v) => C.applyFn('sin', [v])),
  cos: (a) => mapUn(a[0], (v) => C.applyFn('cos', [v])),
  tan: (a) => mapUn(a[0], (v) => C.applyFn('tan', [v])),
  arcsin: (a) => mapUn(a[0], (v) => C.applyFn('arcsin', [v])),
  arccos: (a) => mapUn(a[0], (v) => C.applyFn('arccos', [v])),
  arctan: (a) => mapUn(a[0], (v) => C.applyFn('arctan', [v])),
  sinh: (a) => mapUn(a[0], (v) => C.applyFn('sinh', [v])),
  cosh: (a) => mapUn(a[0], (v) => C.applyFn('cosh', [v])),
  tanh: (a) => mapUn(a[0], (v) => C.applyFn('tanh', [v])),

  floor: (a) => mapUn(a[0], (v) => C.applyFn('floor', [v])),
  ceiling: (a) => mapUn(a[0], (v) => C.applyFn('ceiling', [v])),
  sign: (a) => mapUn(a[0], (v) => C.applyFn('sign', [v])),
  ipart: (a) => mapUn(a[0], (v) => num(Math.trunc(asNumber(v)))),
  fpart: (a) => mapUn(a[0], (v) => flt(asNumber(v) - Math.trunc(asNumber(v)))),
  round: (a) => {
    const d = a.length > 1 ? asInt(a[1]) : 0;
    const f = 10 ** d;
    return mapUn(a[0], (v) => flt(Math.round(asNumber(v) * f) / f));
  },
  approx: (a) => flt(asNumber(a[0])),
  exact: (a) => a[0],

  /* ---- integer theory ---- */
  gcd: (a) => num(bigGcd(BigInt(asInt(a[0])), BigInt(asInt(a[1])))),
  lcm: (a) => {
    const x = BigInt(asInt(a[0]));
    const y = BigInt(asInt(a[1]));
    if (x === 0n || y === 0n) return num(0);
    const g = bigGcd(x, y);
    const l = (x * y) / g;
    return num(new Rat(l < 0n ? -l : l));
  },
  mod: (a) => {
    const m = asNumber(a[1]);
    const v = asNumber(a[0]);
    return m === 0 ? flt(v) : flt(v - m * Math.floor(v / m));
  },
  remain: (a) => flt(asNumber(a[0]) % asNumber(a[1])),
  factorial: (a) => mapUn(a[0], (v) => factorial(asInt(v))),
  ncr: (a) => {
    const n = asInt(a[0]);
    const r = asInt(a[1]);
    if (r < 0 || r > n) return num(0);
    let acc = 1n;
    for (let i = 0n; i < BigInt(r); i += 1n) acc = (acc * (BigInt(n) - i)) / (i + 1n);
    return num(new Rat(acc));
  },
  npr: (a) => {
    const n = asInt(a[0]);
    const r = asInt(a[1]);
    let acc = 1n;
    for (let i = 0n; i < BigInt(r); i += 1n) acc *= BigInt(n) - i;
    return num(new Rat(acc));
  },

  /* ---- CAS ---- */
  expand: (a) => S.expand(a[0]),
  factor: (a) => {
    const e = a[0];
    if (S.isNum(e) && e.r.isInt) return factorInteger(e.r.n);
    const name = a[1] ? varNameOf(a[1]) : guessVar(e);
    return C.factorPoly(e, name) ?? e;
  },
  solve: (a) => {
    const name = a[1] ? varNameOf(a[1]) : guessVar(a[0]);
    const sols = C.solve(a[0], name);
    if (!sols.length) return S.Sym('false');
    return sols.length === 1 ? sols[0] : S.List(sols);
  },
  zeros: (a) => {
    const name = a[1] ? varNameOf(a[1]) : guessVar(a[0]);
    return S.List(C.zeros(a[0], name));
  },
  nsolve: (a) => {
    const name = a[1] ? varNameOf(a[1]) : guessVar(a[0]);
    const v = C.nsolve(a[0], name);
    if (v === null) throw new Error('No solution found');
    return flt(v);
  },
  derivative: (a) => C.diff(a[0], varNameOf(a[1], guessVar(a[0])), a[2] ? asInt(a[2]) : 1),
  integral: (a) => {
    const name = varNameOf(a[1], guessVar(a[0]));
    const anti = C.integrate(a[0], name);
    if (a.length >= 4) {
      return S.sub(C.substitute(anti, name, a[3]), C.substitute(anti, name, a[2]));
    }
    return anti;
  },
  limit: (a) => C.limit(a[0], varNameOf(a[1], guessVar(a[0])), a[2] ?? S.Num(0)),
  tangentline: (a) => {
    const name = varNameOf(a[1], guessVar(a[0]));
    const at = a[2] ?? S.Num(0);
    const slope = C.substitute(C.diff(a[0], name), name, at);
    const y0 = C.substitute(a[0], name, at);
    return S.add(y0, S.mul(slope, S.sub(S.Sym(name), at)));
  },
  normalline: (a) => {
    const name = varNameOf(a[1], guessVar(a[0]));
    const at = a[2] ?? S.Num(0);
    const slope = C.substitute(C.diff(a[0], name), name, at);
    const y0 = C.substitute(a[0], name, at);
    return S.add(y0, S.mul(S.div(S.Num(-1), slope), S.sub(S.Sym(name), at)));
  },
  taylor: (a) => {
    const name = varNameOf(a[1], guessVar(a[0]));
    const order = asInt(a[2] ?? S.Num(4));
    const at = a[3] ?? S.Num(0);
    let out = S.Num(0);
    let fact = 1n;
    for (let n = 0; n <= order; n += 1) {
      if (n > 0) fact *= BigInt(n);
      const d = C.substitute(C.diff(a[0], name, n), name, at);
      out = S.add(out, S.mul(S.div(d, S.Num(new Rat(fact))), S.pow(S.sub(S.Sym(name), at), S.Num(n))));
    }
    return out;
  },
  completesquare: (a) => {
    const name = a[1] ? varNameOf(a[1]) : guessVar(a[0]);
    const co = S.polyCoeffs(a[0], name);
    if (!co || co.length !== 3) return a[0];
    const [c, b, aa] = co;
    const h = b.div(aa.mul(new Rat(2n)));
    const kk = c.sub(aa.mul(h).mul(h));
    return S.add(S.mul(S.Num(aa), S.pow(S.add(S.Sym(name), S.Num(h)), S.Num(2))), S.Num(kk));
  },

  /* ---- lists and statistics ---- */
  dim: (a) => num(asList(a[0]).length),
  sum: (a) => asList(a[0]).reduce((acc, v) => S.add(acc, v), S.Num(0)),
  product: (a) => asList(a[0]).reduce((acc, v) => S.mul(acc, v), S.Num(1)),
  mean: (a) => S.div(FN.sum(a), num(asList(a[0]).length)),
  median: (a) => {
    const xs = sortedNodes(a[0]);
    const n = xs.length;
    if (!n) throw new Error('Dimension error');
    return n % 2 ? xs[(n - 1) / 2] : S.div(S.add(xs[n / 2 - 1], xs[n / 2]), num(2));
  },
  min: (a) => (a.length > 1
    ? (C.evalNum(a[0]) <= C.evalNum(a[1]) ? a[0] : a[1])
    : sortedNodes(a[0])[0]),
  max: (a) => (a.length > 1
    ? (C.evalNum(a[0]) >= C.evalNum(a[1]) ? a[0] : a[1])
    : sortedNodes(a[0])[asList(a[0]).length - 1]),
  stdevsamp: (a) => S.sqrt(varianceExact(asList(a[0]), 1)),
  varsamp: (a) => varianceExact(asList(a[0]), 1),
  stdevpop: (a) => S.sqrt(varianceExact(asList(a[0]), 0)),
  varpop: (a) => varianceExact(asList(a[0]), 0),
  sorta: (a) => S.List(sortedNodes(a[0])),
  sortd: (a) => S.List(sortedNodes(a[0]).reverse()),
  cumulativesum: (a) => {
    let acc = S.Num(0);
    return S.List(asList(a[0]).map((v) => (acc = S.add(acc, v))));
  },
  augment: (a) => S.List([...asList(a[0]), ...asList(a[1])]),
  seq: (a, node) => {
    const name = node.args[1].name ?? 'n';
    const lo = asInt(a[2]);
    const hi = asInt(a[3]);
    const step = a[4] ? asNumber(a[4]) : 1;
    const out = [];
    for (let v = lo; step > 0 ? v <= hi : v >= hi; v += step) {
      out.push(C.substitute(a[0], name, num(v)));
      if (out.length > 5000) break;
    }
    return S.List(out);
  },

  /* ---- distributions (argument order per the CAS Reference Guide) ---- */
  normpdf: (a) => mapUn(a[0], (v) => flt(D.normPdf(asNumber(v), optNum(a[1], 0), optNum(a[2], 1)))),
  normcdf: (a) => flt(D.normCdf(asNumber(a[0]), asNumber(a[1]), optNum(a[2], 0), optNum(a[3], 1))),
  invnorm: (a) => flt(D.invNorm(asNumber(a[0]), optNum(a[1], 0), optNum(a[2], 1))),

  tpdf: (a) => mapUn(a[0], (v) => flt(D.tPdf(asNumber(v), asNumber(a[1])))),
  tcdf: (a) => flt(D.tCdf(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]))),
  invt: (a) => flt(D.invT(asNumber(a[0]), asNumber(a[1]))),

  chi2pdf: (a) => mapUn(a[0], (v) => flt(D.chi2Pdf(asNumber(v), asNumber(a[1])))),
  chi2cdf: (a) => flt(D.chi2Cdf(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]))),
  invchi2: (a) => flt(D.invChi2(asNumber(a[0]), asNumber(a[1]))),

  fpdf: (a) => mapUn(a[0], (v) => flt(D.FPdf(asNumber(v), asNumber(a[1]), asNumber(a[2])))),
  fcdf: (a) => flt(D.FCdf(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]), asNumber(a[3]))),
  invf: (a) => flt(D.invF(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]))),

  binompdf: (a) => (a[2] === undefined
    ? S.List(Array.from({ length: asInt(a[0]) + 1 }, (_, x) => flt(D.binomPdf(asInt(a[0]), asNumber(a[1]), x))))
    : mapUn(a[2], (v) => flt(D.binomPdf(asInt(a[0]), asNumber(a[1]), asNumber(v))))),
  binomcdf: (a) => (a[2] === undefined
    ? S.List(Array.from({ length: asInt(a[0]) + 1 }, (_, x) => flt(D.binomCdf(asInt(a[0]), asNumber(a[1]), 0, x))))
    : flt(D.binomCdf(asInt(a[0]), asNumber(a[1]), asNumber(a[2]), a[3] === undefined ? asNumber(a[2]) : asNumber(a[3])))),

  geompdf: (a) => mapUn(a[1], (v) => flt(D.geomPdf(asNumber(a[0]), asNumber(v)))),
  geomcdf: (a) => flt(D.geomCdf(asNumber(a[0]), asNumber(a[1]), a[2] === undefined ? asNumber(a[1]) : asNumber(a[2]))),

  poisspdf: (a) => mapUn(a[1], (v) => flt(D.poissPdf(asNumber(a[0]), asNumber(v)))),
  poisscdf: (a) => flt(D.poissCdf(asNumber(a[0]), asNumber(a[1]), a[2] === undefined ? asNumber(a[1]) : asNumber(a[2]))),

  /* ---- random ---- */
  rand: (a) => (a.length ? S.List(Array.from({ length: asInt(a[0]) }, () => flt(Math.random()))) : flt(Math.random())),
  randint: (a) => {
    const lo = asInt(a[0]);
    const hi = asInt(a[1]);
    const one = () => num(lo + Math.floor(Math.random() * (hi - lo + 1)));
    return a[2] ? S.List(Array.from({ length: asInt(a[2]) }, one)) : one();
  },
};

// Names the handheld spells differently.
FN.asin = FN.arcsin; FN.acos = FN.arccos; FN.atan = FN.arctan;
FN['sin⁻¹'] = FN.arcsin;
FN.stddev = FN.stdevsamp; FN.stdev = FN.stdevsamp; FN.variance = FN.varsamp;
FN.prod = FN.product; FN.ceil = FN.ceiling;
FN.d = FN.derivative; FN.deriv = FN.derivative;
FN.nint = FN.integral; FN.nderiv = FN.derivative;

// The handheld spells the chi-square family with the Greek letter.
FN['χ²pdf'] = FN.chi2pdf;
FN['χ²cdf'] = FN.chi2cdf;
FN['invχ²'] = FN.invchi2;

/** Variance kept exact, so stDevSamp of exact data can return a radical. */
function varianceExact(items, ddof) {
  const n = items.length;
  if (n - ddof < 1) throw new Error('Dimension error');
  const mean = S.div(items.reduce((acc, v) => S.add(acc, v), S.Num(0)), num(n));
  const ss = items.reduce((acc, v) => S.add(acc, S.pow(S.sub(v, mean), num(2))), S.Num(0));
  return S.div(ss, num(n - ddof));
}

function factorial(n) {
  if (n < 0) throw new Error('Domain error');
  if (n > 5000) throw new Error('Overflow');
  let r = 1n;
  for (let i = 2n; i <= BigInt(n); i += 1n) r *= i;
  return S.Num(new Rat(r));
}

function bigGcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) { [a, b] = [b, a % b]; }
  return new Rat(a);
}

/**
 * factor(60) -> 2^2*3*5, as the handheld prints it.
 * The result uses display-only nodes: a canonical product would immediately
 * multiply itself back out to 60.
 */
function factorInteger(n) {
  const negative = n < 0n;
  let m = negative ? -n : n;
  if (m <= 1n) return S.Num(n);
  const parts = [];
  if (negative) parts.push(S.Num(-1));
  for (let p = 2n; p * p <= m && p < 1000000n; p += 1n) {
    let e = 0;
    while (m % p === 0n) { m /= p; e += 1; }
    if (e === 1) parts.push(S.Num(new Rat(p)));
    else if (e > 1) parts.push({ k: 'rawpow', b: S.Num(new Rat(p)), e });
  }
  if (m > 1n) parts.push(S.Num(new Rat(m)));
  if (parts.length === 1) return parts[0];
  return { k: 'rawmul', args: parts };
}

/* ============================== commands ============================== */

/**
 * Run a statistics command: compute its [name, value] rows, publish them as
 * stat.* variables, and hand back the results table the handheld displays.
 */
function runCommand(fn, args) {
  const toNums = (node) => asList(node).map(asNumber);
  const ctx = {
    raw: args,
    n: (i) => asNumber(args[i]),
    l: (i) => toNums(args[i]),
    toNums,
  };
  const rows = fn(ctx);
  EV.approx = true; // statistics results print as decimals on the handheld

  const out = [];
  for (const [name, value] of rows) {
    const node = toNode(value);
    vars.set(name, node);
    out.push([name, node]);
  }
  const table = { k: 'statresults', rows: out };
  vars.set('stat.results', table);
  return table;
}

function toNode(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? flt(v) : S.Sym('undef');
  if (typeof v === 'string') return { k: 'text', s: v };
  if (Array.isArray(v)) return S.List(v.map(toNode));
  return v;
}

/* ============================== approximation ============================== */

/** Replace everything with floats; used by approx() and ctrl-enter. */
function approximate(e) {
  if (e.k === 'text') return e;
  if (e.k === 'statresults') {
    return { k: 'statresults', rows: e.rows.map(([n, v]) => [n, approximate(v)]) };
  }
  if (e.k === 'list') return S.List(e.items.map(approximate));
  if (e.k === 'rel') return S.Rel(e.op, approximate(e.l), approximate(e.r));
  const v = C.evalNum(e);
  return Number.isFinite(v) ? { k: 'float', x: v } : e;
}

/* ============================== entry points ============================== */

export function evaluateValue(src) {
  EV.approx = false;
  const state = { approx: false };
  const node = build(parse(lex(src), state));
  // Calculation Mode: Approximate always decimalises, Exact never does.
  const out = settings.calc === 'APPROX' ? approximate(node)
    : settings.calc === 'EXACT' ? node
      : (state.approx || EV.approx ? approximate(node) : node);
  if (out && out.k !== 'statresults') lastAns = out;
  return out;
}

export function evaluate(src) {
  return render(evaluateValue(src));
}

/**
 * Compile an expression once into a numeric function of one variable.
 * Graphs calls this a few hundred times per redraw, so parsing per point
 * would be wasteful.
 */
export function compileFunction(src, varName = 'x') {
  const node = build(parse(lex(src), { approx: false }));
  return (v) => C.evalNum(node, { [varName]: v });
}

/** Symbolic derivative of a compiled expression, also as a numeric function. */
export function compileDerivative(src, varName = 'x') {
  const node = build(parse(lex(src), { approx: false }));
  const d = C.diff(node, varName);
  return (v) => C.evalNum(d, { [varName]: v });
}

function render(e) {
  if (e.k === 'text') return `"${e.s}"`;
  if (e.k === 'statresults') {
    return e.rows.map(([name, v]) => `${name}\t${render(v)}`).join('\n');
  }
  if (e.k === 'float') return withDot(fmtFloat(e.x));
  if (e.k === 'list') return `{${e.items.map(render).join(',')}}`;
  if (e.k === 'rel' && (e.l.k === 'float' || e.r.k === 'float')) {
    return `${render(e.l)}${e.op}${render(e.r)}`;
  }
  return fmt(e, 0);
}

/** The handheld marks approximate results with a trailing dot: 3 becomes "3." */
function withDot(s) {
  return /^-?\d+$/.test(s) ? `${s}.` : s;
}
