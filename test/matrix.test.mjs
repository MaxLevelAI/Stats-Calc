import { t, group } from './harness.mjs';
import * as MX from '../src/js/math/matrix.js';
import { evaluate, userFns, vars } from '../src/js/math/engine.js';

const e = (src) => {
  try { return evaluate(src); } catch (err) { return `ERR: ${err.message}`; }
};

group('determinants and rank');
t('2x2', MX.det([[1, 2], [3, 4]]), -2);
t('3x3', MX.det([[6, 1, 1], [4, -2, 5], [2, 8, 7]]), -306);
t('singular', MX.det([[2, 0, 1], [1, 3, 2], [1, 1, 1]]), 0);
t('identity', MX.det(MX.identity(4)), 1);
t('rank of a singular matrix', MX.rank([[1, 2], [2, 4]]), 1);

group('elimination');
t('rref reaches the identity',
  JSON.stringify(MX.rref([[1, 2, 3], [4, 5, 6], [7, 8, 10]])),
  JSON.stringify(MX.identity(3)));
t('inverse times original is the identity',
  JSON.stringify(MX.tidy(MX.matMul([[4, 7], [2, 6]], MX.inverse([[4, 7], [2, 6]])))),
  JSON.stringify(MX.identity(2)));
t('simult solves x+y=5, x-y=1',
  JSON.stringify(MX.simult([[1, 1], [1, -1]], [5, 1])),
  '[[3],[2]]');
t('singular system is rejected',
  (() => { try { MX.simult([[1, 1], [2, 2]], [1, 2]); return 'no error'; } catch (err) { return err.message; } })(),
  'Singular matrix');

group('shape');
t('transpose', JSON.stringify(MX.transpose([[1, 2, 3], [4, 5, 6]])), '[[1,4],[2,5],[3,6]]');
t('augment', JSON.stringify(MX.augment([[1], [2]], [[3], [4]])), '[[1,3],[2,4]]');
t('subMat', JSON.stringify(MX.subMat([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 2, 2)), '[[5,6],[8,9]]');
t('diag from a list', JSON.stringify(MX.diag([1, 2])), '[[1,0],[0,2]]');
t('diag from a matrix', JSON.stringify(MX.diag([[1, 9], [9, 2]])), '[1,2]');
t('trace', MX.trace([[1, 2], [3, 4]]), 5);

group('norms and row operations');
t('Frobenius norm', MX.norm([[3, 4]]), 5);
t('row norm', MX.rowNorm([[1, -2], [3, 4]]), 7);
t('column norm', MX.colNorm([[1, -2], [3, 4]]), 6);
t('rowSwap', JSON.stringify(MX.rowSwap([[1, 2], [3, 4]], 1, 2)), '[[3,4],[1,2]]');
t('mRow', JSON.stringify(MX.mRow(3, [[1, 2], [3, 4]], 1)), '[[3,6],[3,4]]');
t('mRowAdd', JSON.stringify(MX.mRowAdd(-3, [[1, 2], [3, 4]], 1, 2)), '[[1,2],[0,-2]]');

group('eigenvalues');
t('diagonal', JSON.stringify(MX.eigenvalues([[2, 0], [0, 3]])), '[2,3]');
t('2x2', JSON.stringify(MX.eigenvalues([[4, 1], [2, 3]])), '[2,5]');
t('symmetric 3x3', JSON.stringify(MX.eigenvalues([[2, 0, 0], [0, 3, 4], [0, 4, 9]])), '[1,2,11]');
t('characteristic polynomial', JSON.stringify(MX.charPoly([[1, 2], [3, 4]])), '[-2,-5,1]');
t('eigenvector of a diagonal matrix',
  JSON.stringify(MX.eigenvectors([[2, 0], [0, 3]])), '[[1,0],[0,1]]');

group('vectors');
t('dot product', MX.dotP([1, 2, 3], [4, 5, 6]), 32);
t('cross product', JSON.stringify(MX.crossP([1, 0, 0], [0, 1, 0])), '[0,0,1]');
t('unit vector', JSON.stringify(MX.unitV([3, 4])), '[0.6,0.8]');
t('cross product needs three elements',
  (() => { try { MX.crossP([1, 2], [3, 4]); return 'no error'; } catch (err) { return err.message; } })(),
  'Cross product needs 3 elements');

group('reachable from the entry line');
t('det', e('det([[1,2],[3,4]])'), '-2');
t('rref prints as a matrix', e('rref([[1,2,3],[4,5,6],[7,8,10]])'), '[[1,0,0],[0,1,0],[0,0,1]]');
t('a plain list still prints in braces', e('{1,2,3}'), '{1,2,3}');
t('simult', e('simult([[1,1],[1,-1]],[5,1])'), '[[3],[2]]');
t('eigVl', e('eigVl([[4,1],[2,3]])'), '{2,5}');
t('charPoly', e('charPoly([[1,2],[3,4]])'), 'x²-5·x-2');
t('whole results stay exact', e('trace([[1,2],[3,4]])'), '5');

group('user functions');
userFns.clear();
vars.clear();
t('Define acknowledges', e('Define f(x)=x^2+1'), 'Done');
t('and evaluates', e('f(3)'), '10');
t('and stays symbolic', e('f(x)'), 'x²+1');
t('the CAS can differentiate it', e('derivative(f(x),x)'), '2·x');
t('two parameters', (e('Define g(a,b)=a*b'), e('g(4,5)')), '20');
t(':= defines too', (e('h(x):=2x+1'), e('h(10)')), '21');
t('a plain value', (e('Define k=42'), e('k*2')), '84');
t('wrong arity is caught', e('f(1,2)'), 'ERR: f expects 1 argument');
