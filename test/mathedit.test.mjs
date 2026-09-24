import { t, group } from './harness.mjs';
import * as M from '../src/js/mathedit.js';
import { evaluate } from '../src/js/math/engine.js';

const frac = (n, d) => ({ t: 'frac', num: M.rowOf(n), den: M.rowOf(d) });
const sqrt = (x) => ({ t: 'sqrt', rad: M.rowOf(x) });
const sup = (e) => ({ t: 'sup', exp: M.rowOf(e) });

group('linearisation');
t('fraction', M.linearize(M.row([frac('1', '2')])), '(1)/(2)');
t('square root', M.linearize(M.row([sqrt('12')])), 'sqrt(12)');
t('exponent', M.linearize(M.row([M.ch('x'), sup('2')])), 'x^(2)');
t('nth root', M.linearize(M.row([{ t: 'nthroot', idx: M.rowOf('3'), rad: M.rowOf('8') }])), 'root(8,3)');
t('absolute value', M.linearize(M.row([{ t: 'abs', body: M.rowOf('-5') }])), 'abs(-5)');
t('log base', M.linearize(M.row([{ t: 'log', base: M.rowOf('2'), arg: M.rowOf('8') }])), 'log(2,8)');
t('e exponent', M.linearize(M.row([{ t: 'expE', exp: M.rowOf('x') }])), 'ℯ^(x)');

t('definite integral',
  M.linearize(M.row([{ t: 'integral', lo: M.rowOf('0'), hi: M.rowOf('3'), body: M.row([M.ch('x'), sup('2')]), var: M.rowOf('x') }])),
  'integral(x^(2),x,0,3)');
t('indefinite integral',
  M.linearize(M.row([{ t: 'integralInd', body: M.rowOf('2x'), var: M.rowOf('x') }])),
  'integral(2x,x)');
t('summation',
  M.linearize(M.row([{ t: 'sum', var: M.rowOf('n'), lo: M.rowOf('1'), hi: M.rowOf('4'), body: M.rowOf('n') }])),
  'sum(seq(n,n,1,4))');
t('derivative',
  M.linearize(M.row([{ t: 'deriv', var: M.rowOf('x'), body: M.row([M.ch('x'), sup('3')]) }])),
  'derivative(x^(3),x)');
t('limit',
  M.linearize(M.row([{ t: 'limit', var: M.rowOf('x'), to: M.rowOf('0'), body: M.rowOf('sin(x)/x') }])),
  'limit(sin(x)/x,x,0)');

group('nesting');
const nested = M.row([{ t: 'sqrt', rad: M.row([frac('1', '2')]) }]);
t('fraction inside a radical', M.linearize(nested), 'sqrt((1)/(2))');
const deep = M.row([frac('1', '3'), M.ch('+'), frac('1', '6')]);
t('two fractions', M.linearize(deep), '(1)/(3)+(1)/(6)');

group('the engine accepts what the editor produces');
t('fraction sum evaluates', evaluate(M.linearize(deep)), '1/2');
t('radical evaluates', evaluate(M.linearize(nested)), '√(2)/2');
t('integral evaluates',
  evaluate(M.linearize(M.row([{ t: 'integral', lo: M.rowOf('0'), hi: M.rowOf('3'), body: M.row([M.ch('x'), sup('2')]), var: M.rowOf('x') }]))),
  '9');
t('summation evaluates',
  evaluate(M.linearize(M.row([{ t: 'sum', var: M.rowOf('n'), lo: M.rowOf('1'), hi: M.rowOf('4'), body: M.rowOf('n') }]))),
  '10');
t('derivative evaluates',
  evaluate(M.linearize(M.row([{ t: 'deriv', var: M.rowOf('x'), body: M.row([M.ch('x'), sup('3')]) }]))),
  '3·x²');

group('cursor movement');
const root = M.row([frac('1', '2')]);
let cur = { row: root, i: 0 };
cur = M.moveRight(root, cur);
t('right enters the numerator', cur.row === root.items[0].num, true);
const down = M.moveVertical(root, cur, 1);
t('down reaches the denominator', down.row === root.items[0].den, true);
const up = M.moveVertical(root, down, -1);
t('up returns to the numerator', up.row === root.items[0].num, true);
let out = { row: root.items[0].den, i: 1 };
out = M.moveRight(root, out);
t('right off the denominator exits the fraction', out.row === root, true);
t('and lands after it', out.i, 1);

group('editing');
const r2 = M.row([]);
let c2 = { row: r2, i: 0 };
c2 = M.insertText(c2, '12');
t('typing inserts characters', M.linearize(r2), '12');
c2 = M.insertNode(c2, frac('', ''));
t('inserting a template moves into its first slot', c2.row === r2.items[2].num, true);
c2 = M.insertText(c2, '3');
t('typing fills the slot', M.linearize(r2), '12(3)/()');
c2 = M.backspace(r2, c2);
t('backspace clears the slot', M.linearize(r2), '12()/()');

group('Notes math box');
const box = { t: 'mathbox', expr: M.rowOf('1/2+1/3'), result: null, showResult: true };
t('linearises to just its expression', M.linearize(M.row([box])), '1/2+1/3');
t('and the engine evaluates it', evaluate(M.linearize(M.row([box]))), '5/6');
t('renders as a math box', M.render(M.row([box]), null).includes('nt-mbox'), true);
box.result = '5/6';
t('shows the result once evaluated', M.render(M.row([box]), null).includes('5/6'), true);
box.active = false;
t('a deactivated box is marked', M.render(M.row([box]), null).includes('nt-mbox off'), true);
