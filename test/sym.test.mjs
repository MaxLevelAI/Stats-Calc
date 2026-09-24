import { t, group } from './harness.mjs';
import * as S from '../src/js/math/sym.js';
import { Rat } from '../src/js/math/rational.js';

const x = S.Sym('x');
const y = S.Sym('y');
const N = S.Num;
const R = (n, d) => N(new Rat(BigInt(n), BigInt(d)));
const k = S.key;

group('canonical simplification');
t('x+x', k(S.add(x, x)), k(S.mul(N(2), x)));
t('x-x', k(S.sub(x, x)), k(N(0)));
t('2*3', k(S.mul(N(2), N(3))), k(N(6)));
t('x*x', k(S.mul(x, x)), k(S.pow(x, N(2))));
t('1/3+1/6', k(S.add(R(1, 3), R(1, 6))), k(R(1, 2)));
t('x^0', k(S.pow(x, N(0))), k(N(1)));
t('0*x', k(S.mul(N(0), x)), k(N(0)));
t('x/x', k(S.div(x, x)), k(N(1)));
t('2x+3x', k(S.add(S.mul(N(2), x), S.mul(N(3), x))), k(S.mul(N(5), x)));

group('radicals');
t('sqrt(4)', k(S.sqrt(N(4))), k(N(2)));
t('sqrt(12)', k(S.sqrt(N(12))), k(S.mul(N(2), S.sqrt(N(3)))));
t('sqrt(1/2)', k(S.sqrt(R(1, 2))), k(S.mul(R(1, 2), S.sqrt(N(2)))));
t('sqrt(8)', k(S.sqrt(N(8))), k(S.mul(N(2), S.sqrt(N(2)))));
t('8^(1/3)', k(S.pow(N(8), R(1, 3))), k(N(2)));
t('sqrt(2)^2', k(S.pow(S.sqrt(N(2)), N(2))), k(N(2)));

group('expand');
t('(x+1)^2', k(S.expand(S.pow(S.add(x, N(1)), N(2)))),
  k(S.add(S.pow(x, N(2)), S.mul(N(2), x), N(1))));
t('(x+1)(x-1)', k(S.expand(S.mul(S.add(x, N(1)), S.sub(x, N(1))))),
  k(S.sub(S.pow(x, N(2)), N(1))));
t('(x+y)^2 has 3 terms', S.expand(S.pow(S.add(x, y), N(2))).args.length, 3);

group('polynomials');
t('coeffs (x+2)^3', S.polyCoeffs(S.pow(S.add(x, N(2)), N(3)), 'x').map(String).join(','), '8,12,6,1');
t('coeffs of y (not poly in x)', S.polyCoeffs(S.pow(x, S.Sym('n')), 'x'), null);
t('roots x^3-6x^2+11x-6',
  S.rationalRoots([new Rat(-6n), new Rat(11n), new Rat(-6n), new Rat(1n)]).map(String).sort().join(','),
  '1,2,3');
t('roots 2x^2-3x+1',
  S.rationalRoots([new Rat(1n), new Rat(-3n), new Rat(2n)]).map(String).sort().join(','),
  '1,1/2');
t('deflate (x-1) from x^2-1',
  S.deflate([new Rat(-1n), new Rat(0n), new Rat(1n)], new Rat(1n)).map(String).join(','),
  '1,1');

group('structure');
t('freeVars', S.freeVars(S.add(S.mul(x, y), N(3))).sort().join(','), 'x,y');
t('containsSym', S.containsSym(S.mul(x, y), 'y'), true);
t('polyToExpr round trip',
  k(S.polyToExpr(S.polyCoeffs(S.add(S.pow(x, N(2)), N(1)), 'x'), 'x')),
  k(S.add(S.pow(x, N(2)), N(1))));
