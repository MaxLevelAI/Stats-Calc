// Expression engine: tokenise -> Pratt-parse -> build a symbolic tree -> format.
//
// Results stay exact the way a CAS handheld's do: 1/3+1/6 is 1/2, sqrt(12) is
// 2*sqrt(3), sin(pi/6) is 1/2, and x+x is 2*x. Typing a decimal anywhere makes
// the whole result approximate, which is also how the handheld behaves.

import { Rat } from './rational.js';
import * as S from './sym.js';
import * as C from './cas.js';
import * as D from './dist.js';
import * as MX from './matrix.js';
import * as FIN from './finance.js';
import { COMMANDS, COMMAND_IMPL } from './commands.js';
import { CATALOG } from './catalog.js';
import { fmt, fmtFloat } from './format.js';

export const settings = C.settings; // { angle: 'RAD' | 'DEG' | 'GRAD' }

/**
 * Names the Reference Guide documents. A call to one of these that this build
 * has not implemented must say so rather than echoing back unevaluated -- an
 * unevaluated det(...) reads like a result and is easy to copy down by mistake.
 */
const CATALOG_NAMES = new Set(CATALOG.map((e) => e.name.toLowerCase()));

// Statement keywords that cannot sensibly be variable names, so seeing one
// bare means the user wanted the command.
const KEYWORDS = new Set([
  'define', 'func', 'endfunc', 'prgm', 'endprgm', 'local',
  'if', 'then', 'elseif', 'else', 'endif',
  'for', 'endfor', 'while', 'endwhile', 'loop', 'endloop',
  'try', 'endtry', 'clrerr', 'passerr',
  'return', 'cycle', 'exit', 'goto', 'lbl', 'stop',
  'disp', 'dispat', 'request', 'requeststr', 'wait', 'pause',
]);

const notBuilt = (name) =>
  new Error(`${name}: in the catalog, not implemented in this build`);

/** Does this build actually compute `name`? Used by the catalog browser too. */
export function isImplemented(name) {
  const low = String(name).toLowerCase();
  return Boolean(FN[name] ?? FN[low] ?? COMMAND_IMPL[low]);
}

/** User variables, cleared by ClearAZ / DelVar. */
export const vars = new Map();

/** User functions from Define / := , stored as parameters plus an AST body. */
export const userFns = new Map();

// Parameter bindings while a user function is being expanded.
const scopes = [];

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
      if (/^define$/i.test(tk.text)) return { n: 'define', body: expr(0) };
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
      for (let i = scopes.length - 1; i >= 0; i -= 1) {
        if (name in scopes[i]) return scopes[i][name];
      }
      if (KEYWORDS.has(name.toLowerCase()) && !vars.has(name)) throw notBuilt(name);
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
        if (target.n === 'call') return defineFrom({ n: 'bin', op: '=', a: target, b: value });
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
      if (!fn) throw notBuilt(node.name);
      return runCommand(fn, node.args.map(build));
    }

    case 'define': return defineFrom(node.body);

    case 'call': {
      const name = node.name;
      const lower = name.toLowerCase();

      // a user function expands with its parameters bound to the arguments
      const uf = userFns.get(lower);
      if (uf) {
        if (node.args.length !== uf.params.length) {
          throw new Error(`${name} expects ${uf.params.length} argument${uf.params.length === 1 ? '' : 's'}`);
        }
        const bound = {};
        uf.params.forEach((pn, i) => { bound[pn] = build(node.args[i]); });
        if (scopes.length > 24) throw new Error('Too many nested calls');
        scopes.push(bound);
        try { return build(uf.body); } finally { scopes.pop(); }
      }
      const fn = FN[name] ?? FN[lower];
      if (fn) return fn(node.args.map(build), node);
      // A documented command we have not built must say so. Anything else is
      // treated as a user function and stays symbolic, which is correct.
      if (CATALOG_NAMES.has(lower)) throw notBuilt(name);
      return { k: 'fn', name, args: node.args.map(build) };
    }

    default:
      throw new Error('Syntax error');
  }
}

// A command's acknowledgement prints bare; a string literal keeps its quotes.
const DONE = { k: 'text', s: 'Done', bare: true };

/** Define f(x)=... or Define a=...; returns TI's "Done". */
function defineFrom(body) {
  if (!body || body.n !== 'bin' || body.op !== '=') {
    throw new Error('Define expects name(args)=expression');
  }
  const target = body.a;

  if (target.n === 'call') {
    const params = target.args.map((a) => {
      if (a.n !== 'var') throw new Error('Parameters must be names');
      return a.name;
    });
    userFns.set(target.name.toLowerCase(), { params, body: body.b, name: target.name });
    return DONE;
  }

  if (target.n === 'var') {
    vars.set(target.name, build(body.b));
    return DONE;
  }
  throw new Error('Define expects name(args)=expression');
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

/** A list of equal-length lists, read as a matrix of numbers. */
function mat(e) {
  if (!e || e.k !== 'list') throw new Error('Expected a matrix');
  const m = e.items.map((r) => (r.k === 'list' ? r.items.map(asNumber) : [asNumber(r)]));
  if (!MX.isMatrix(m)) throw new Error('Rows must be the same length');
  return m;
}

/** A flat list, read as a vector; a 1xN or Nx1 matrix counts too. */
function vec(e) {
  if (!e || e.k !== 'list') throw new Error('Expected a vector');
  if (e.items[0]?.k === 'list') {
    const m = mat(e);
    return MX.rows(m) === 1 ? m[0] : m.map((r) => r[0]);
  }
  return e.items.map(asNumber);
}

/** Whole numbers stay exact; anything else marks the result approximate. */
const numOrFlt = (v) => (Number.isInteger(v) ? S.Num(v) : flt(v));

const toMat = (m) => S.List(m.map((r) => S.List(r.map(numOrFlt))));

/** Money is inherently decimal, and TI reports it to the cent. */
const round2 = (v) => Math.round(v * 100) / 100;
const money = (v) => {
  if (!Number.isFinite(v)) throw new Error('No solution');
  return flt(round2(v));
};

/** Read the trailing optional PpY / CpY / PmtAt arguments TVM shares. */
const fin = (a, from) => {
  const req = a.slice(0, from).map(asNumber);
  const ppy = a[from] !== undefined ? asNumber(a[from]) : 12;
  const cpy = a[from + 1] !== undefined ? asNumber(a[from + 1]) : ppy;
  const at = a[from + 2] !== undefined ? asNumber(a[from + 2]) : 0;
  return [...req, ppy, cpy, at];
};
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

  /* ---- finance (argument order per the CAS Reference Guide) ---- */
  tvmfv: (a) => money(FIN.tvmFV(...fin(a, 4))),
  tvmpv: (a) => money(FIN.tvmPV(...fin(a, 4))),
  tvmpmt: (a) => money(FIN.tvmPmt(...fin(a, 4))),
  tvmn: (a) => money(FIN.tvmN(...fin(a, 4))),
  tvmi: (a) => money(FIN.tvmI(...fin(a, 4))),

  bal: (a) => money(FIN.bal(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]), asNumber(a[3]),
    a[4] ? asNumber(a[4]) : null, ...fin(a.slice(5), 0))),
  amorttbl: (a) => toMat(FIN.amortTbl(asInt(a[0]), asNumber(a[1]), asNumber(a[2]), asNumber(a[3]),
    a[4] ? asNumber(a[4]) : null, ...fin(a.slice(5), 0)).map((r) => r.map(round2))),

  npv: (a) => money(FIN.npv(asNumber(a[0]), asNumber(a[1]), nums(a[2]), a[3] ? nums(a[3]) : null)),
  irr: (a) => money(FIN.irr(asNumber(a[0]), nums(a[1]), a[2] ? nums(a[2]) : null)),
  mirr: (a) => money(FIN.mirr(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]), nums(a[3]),
    a[4] ? nums(a[4]) : null)),

  eff: (a) => money(FIN.eff(asNumber(a[0]), asNumber(a[1]))),
  nom: (a) => money(FIN.nom(asNumber(a[0]), asNumber(a[1]))),
  dbd: (a) => num(FIN.dbd(asNumber(a[0]), asNumber(a[1]))),

  /* ---- matrices and vectors ---- */
  det: (a) => numOrFlt(MX.det(mat(a[0]))),
  ref: (a) => toMat(MX.ref(mat(a[0]))),
  rref: (a) => toMat(MX.rref(mat(a[0]))),
  identity: (a) => toMat(MX.identity(asInt(a[0]))),
  newmat: (a) => toMat(MX.newMat(asInt(a[0]), asInt(a[1]))),
  diag: (a) => {
    const v = a[0];
    const m = v.k === 'list' && v.items[0]?.k === 'list' ? mat(v) : null;
    return m ? S.List(MX.diag(m).map(flt)) : toMat(MX.diag(vec(v)));
  },
  transpose: (a) => toMat(MX.transpose(mat(a[0]))),
  augment: (a) => {
    const x = a[0];
    const y = a[1];
    const bothMat = x.k === 'list' && x.items[0]?.k === 'list';
    if (bothMat) return toMat(MX.augment(mat(x), mat(y)));
    return S.List([...asList(x), ...asList(y)]);
  },
  colaugment: (a) => toMat(MX.colAugment(mat(a[0]), mat(a[1]))),
  submat: (a) => toMat(MX.subMat(mat(a[0]),
    a[1] ? asInt(a[1]) : undefined, a[2] ? asInt(a[2]) : undefined,
    a[3] ? asInt(a[3]) : undefined, a[4] ? asInt(a[4]) : undefined)),
  simult: (a) => toMat(MX.simult(mat(a[0]), a[1].k === 'list' && a[1].items[0]?.k === 'list' ? mat(a[1]) : vec(a[1]))),
  rowdim: (a) => num(MX.rows(mat(a[0]))),
  coldim: (a) => num(MX.cols(mat(a[0]))),
  trace: (a) => numOrFlt(MX.trace(mat(a[0]))),
  norm: (a) => numOrFlt(MX.norm(mat(a[0]))),
  rownorm: (a) => numOrFlt(MX.rowNorm(mat(a[0]))),
  colnorm: (a) => numOrFlt(MX.colNorm(mat(a[0]))),
  rowswap: (a) => toMat(MX.rowSwap(mat(a[0]), asInt(a[1]), asInt(a[2]))),
  rowadd: (a) => toMat(MX.rowAdd(mat(a[0]), asInt(a[1]), asInt(a[2]))),
  mrow: (a) => toMat(MX.mRow(asNumber(a[0]), mat(a[1]), asInt(a[2]))),
  mrowadd: (a) => toMat(MX.mRowAdd(asNumber(a[0]), mat(a[1]), asInt(a[2]), asInt(a[3]))),
  eigvl: (a) => S.List(MX.eigenvalues(mat(a[0])).map(numOrFlt)),
  eigvc: (a) => toMat(MX.eigenvectors(mat(a[0]))),
  charpoly: (a, node) => {
    const c = MX.charPoly(mat(a[0]));
    const name = node.args[1] ? (node.args[1].name ?? 'x') : 'x';
    return S.add(...c.map((k, i) => S.mul(flt(k), S.pow(S.Sym(name), num(i)))));
  },
  randmat: (a) => toMat(MX.newMat(asInt(a[0]), asInt(a[1])).map((r) => r.map(() => Math.floor(Math.random() * 19) - 9))),
  constructmat: (a, node) => {
    const rows = asInt(a[3]);
    const colsN = asInt(a[4]);
    const rv = node.args[1].name ?? 'i';
    const cv = node.args[2].name ?? 'j';
    const out = [];
    for (let i = 1; i <= rows; i += 1) {
      const row = [];
      for (let j = 1; j <= colsN; j += 1) {
        row.push(C.evalNum(C.substitute(C.substitute(a[0], rv, num(i)), cv, num(j))));
      }
      out.push(row);
    }
    return toMat(out);
  },

  dotp: (a) => numOrFlt(MX.dotP(vec(a[0]), vec(a[1]))),
  crossp: (a) => S.List(MX.crossP(vec(a[0]), vec(a[1])).map(numOrFlt)),
  unitv: (a) => S.List(MX.unitV(vec(a[0])).map(flt)),

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
FN.matlist = (a) => S.List(mat(a[0]).flat().map(flt));
FN.listmat = (a, node) => {
  const v = vec(a[0]);
  const c = node.args[1] ? asInt(a[1]) : v.length;
  const out = [];
  for (let i = 0; i < v.length; i += c) out.push(v.slice(i, i + c));
  return toMat(out);
};
FN['Σint'] = (a) => money(FIN.sumInt(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]),
  asNumber(a[3]), asNumber(a[4]), a[5] ? asNumber(a[5]) : null));
FN['Σprn'] = (a) => money(FIN.sumPrn(asNumber(a[0]), asNumber(a[1]), asNumber(a[2]),
  asNumber(a[3]), asNumber(a[4]), a[5] ? asNumber(a[5]) : null));
FN.sumint = FN['Σint'];
FN.sumprn = FN['Σprn'];

FN['list►mat'] = FN.listmat;
FN['mat►list'] = FN.matlist;

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
  if (e.k === 'text') return e.bare ? e.s : `"${e.s}"`;
  if (e.k === 'statresults') {
    return e.rows.map(([name, v]) => `${name}\t${render(v)}`).join('\n');
  }
  if (e.k === 'float') return withDot(fmtFloat(e.x));
  if (e.k === 'list') {
    // matrices print in square brackets, plain lists in braces
    if (isMatrixNode(e)) {
      const rowsOut = e.items.map((r) => `[${r.items.map(render).join(',')}]`);
      return `[${rowsOut.join(',')}]`;
    }
    return `{${e.items.map(render).join(',')}}`;
  }
  if (e.k === 'rel' && (e.l.k === 'float' || e.r.k === 'float')) {
    return `${render(e.l)}${e.op}${render(e.r)}`;
  }
  return fmt(e, 0);
}

/** A list of equal-length, non-empty lists is a matrix. */
export function isMatrixNode(e) {
  return e && e.k === 'list' && e.items.length > 0 && e.items.every(
    (r) => r && r.k === 'list' && r.items.length > 0 && r.items.length === e.items[0].items.length
  );
}

/** The handheld marks approximate results with a trailing dot: 3 becomes "3." */
function withDot(s) {
  return /^-?\d+$/.test(s) ? `${s}.` : s;
}
