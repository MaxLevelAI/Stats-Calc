import { t, group } from './harness.mjs';
import { evaluate } from '../src/js/math/engine.js';

const e = (src) => {
  try { return evaluate(src); } catch (err) { return `ERR: ${err.message}`; }
};

group('exact arithmetic');
t('1/3+1/6', e('1/3+1/6'), '1/2');
t('3/4+1/4', e('3/4+1/4'), '1');
t('2^100', e('2^100'), '1267650600228229401496703205376');
t('5!', e('5!'), '120');
t('nCr(5,2)', e('nCr(5,2)'), '10');
t('nPr(5,2)', e('nPr(5,2)'), '20');
t('gcd(84,36)', e('gcd(84,36)'), '12');
t('decimal makes it approximate', e('1.5*2'), '3.');
t('1/0 is undefined', e('1/0'), 'undef');

group('radicals and exact trig');
t('sqrt(12)', e('sqrt(12)'), '2·√(3)');
t('sqrt(1/2)', e('sqrt(1/2)'), '√(2)/2');
t('sin(pi/6)', e('sin(pi/6)'), '1/2');
t('cos(pi/3)', e('cos(pi/3)'), '1/2');
t('tan(pi/4)', e('tan(pi/4)'), '1');
t('sin(pi)', e('sin(pi)'), '0');
t('ln(e)', e('ln(e)'), '1');

group('symbolic algebra');
t('x+x', e('x+x'), '2·x');
t('2x+3x', e('2x+3x'), '5·x');
t('expand((x+1)^2)', e('expand((x+1)^2)'), 'x²+2·x+1');
t('expand((2x+3)^3)', e('expand((2x+3)^3)'), '8·x³+36·x²+54·x+27');
t('factor(x^2-1)', e('factor(x^2-1)'), '(x-1)·(x+1)');
t('factor(x^2+5x+6)', e('factor(x^2+5x+6)'), '(x+2)·(x+3)');
t('factor(60)', e('factor(60)'), '2²·3·5');
t('factor(-84)', e('factor(-84)'), '-2²·3·7');
t('completeSquare', e('completeSquare(x^2+6x+5,x)'), '(x+3)²-4');

group('solving');
t('solve linear', e('solve(2x+6=0,x)'), 'x=-3');
t('solve quadratic', e('solve(x^2-4=0,x)'), '{x=-2,x=2}');
t('zeros cubic', e('zeros(x^3-6x^2+11x-6,x)'), '{1,2,3}');
t('zeros irrational', e('zeros(x^2-2,x)'), '{-√(2),√(2)}');
t('nSolve', e('nSolve(x^2-2=0,x)'), '-1.41421356237');

group('calculus');
t('d/dx x^3', e('derivative(x^3,x)'), '3·x²');
t('d/dx sin(x)', e('derivative(sin(x),x)'), 'cos(x)');
t('product rule', e('derivative(x^2*sin(x),x)'), 'x²·cos(x)+2·x·sin(x)');
t('d/dx 1/x', e('derivative(1/x,x)'), '-1/x²');
t('integral x^2', e('integral(x^2,x)'), 'x³/3');
t('definite integral', e('integral(x^2,x,0,3)'), '9');
t('integral 1/x', e('integral(1/x,x)'), 'ln(x)');
t('integral sin(2x)', e('integral(sin(2x),x)'), '-cos(2·x)/2');
t('limit 0/0', e('limit((x^2-1)/(x-1),x,1)'), '2');
t('limit sin(x)/x', e('limit(sin(x)/x,x,0)'), '1');
t('taylor', e('taylor(sin(x),x,5)'), 'x⁵/120-x³/6+x');

group('lists and statistics');
t('mean', e('mean({2,4,9})'), '5');
t('median odd', e('median({2,4,9})'), '4');
t('min', e('min({5,2,8})'), '2');
t('max', e('max({5,2,8})'), '8');
t('sum', e('sum({1,2,3,4})'), '10');
t('varSamp exact', e('varSamp({2,4,4,4,5,5,7,9})'), '32/7');
t('stDevSamp exact', e('stDevSamp({2,4,4,4,5,5,7,9})'), '4·√(14)/7');
t('sortA', e('sortA({3,1,2})'), '{1,2,3}');
t('cumulativeSum', e('cumulativeSum({1,2,3})'), '{1,3,6}');
t('dim', e('dim({1,2,3})'), '3');

group('display');
t('reciprocal', e('1/x'), '1/x');
t('coefficient denominator', e('x/(2y)'), 'x/(2·y)');
t('reduces', e('3x^2/6'), 'x²/2');
t('rational function', e('(x+1)/(x-1)'), '(x+1)/(x-1)');
