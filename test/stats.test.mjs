import { t, group } from './harness.mjs';
import * as ST from '../src/js/math/stats.js';
import { evaluate } from '../src/js/math/engine.js';

const f = (v, n = 6) => Number(v).toFixed(n);
const get = (src, name) => {
  const line = evaluate(src).split('\n').find((l) => l.startsWith(`${name}\t`));
  return line ? line.split('\t')[1] : `(no ${name})`;
};
const g6 = (src, name) => f(Number(get(src, name)));

group('one-variable summary');
const ov = ST.oneVar([1, 2, 3, 4, 5, 6, 7, 8]);
const val = (rows, k) => rows.find(([n]) => n === k)[1];
t('mean', val(ov, 'stat.v'), 4.5);
t('sum', val(ov, 'stat.Σx'), 36);
t('sum of squares', val(ov, 'stat.Σx2'), 204);
t('sample sd', f(val(ov, 'stat.sx')), '2.449490');
t('population sd', f(val(ov, 'stat.σx')), '2.291288');
t('SSX', val(ov, 'stat.SSX'), 42);

group('quartiles use TI’s method');
t('odd n excludes the median', JSON.stringify(ST.quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9])),
  '{"q1":2.5,"med":5,"q3":7.5,"min":1,"max":9}');
t('even n splits in half', JSON.stringify(ST.quartiles([1, 2, 3, 4, 5, 6, 7, 8])),
  '{"q1":2.5,"med":4.5,"q3":6.5,"min":1,"max":8}');

group('regression');
const lr = ST.linRegBx([1, 2, 3, 4, 5], [2.1, 4.2, 5.9, 8.1, 9.9]);
t('intercept', f(val(lr, 'stat.a')), '0.190000');
t('slope', f(val(lr, 'stat.b')), '1.950000');
t('r', f(val(lr, 'stat.r')), '0.999383');
t('QuadReg on a parabola', g6('QuadReg {1,2,3,4},{1,4,9,16}', 'stat.a'), '1.000000');
t('ExpReg on 2^x', g6('ExpReg {1,2,3,4},{2,4,8,16}', 'stat.b'), '2.000000');

group('confidence intervals');
t('tInterval lower', g6('tInterval 10,2,25,0.95', 'stat.CLower'), '9.174441');
t('tInterval upper', g6('tInterval 10,2,25,0.95', 'stat.CUpper'), '10.825559');
t('tInterval from data', g6('tInterval {12,15,11,14,13,16,12,15}', 'stat.CLower'), '12.017893');
t('zInterval', g6('zInterval 3,65,30,0.95', 'stat.CUpper'), '66.073516');
t('1-prop z interval', g6('zInterval_1Prop 60,100,0.95', 'stat.CLower'), '0.503982');

group('hypothesis tests');
t('t test statistic', g6('tTest 10,10.5,2,25', 'stat.t'), '1.250000');
t('t test p-value', g6('tTest 10,10.5,2,25', 'stat.PVal'), '0.223351');
t('t test from data', g6('tTest 13,{12,15,11,14,13,16,12,15}', 'stat.t'), '0.797724');
t('z test', g6('zTest 100,15,105,36', 'stat.z'), '2.000000');
t('1-prop z test', g6('zTest_1Prop 0.5,60,100', 'stat.PVal'), '0.045500');
t('2-prop z test', g6('zTest_2Prop 30,50,20,50', 'stat.z'), '2.000000');
t('2-sample t (Welch df)', g6('tTest_2Samp 10,2,25,9,3,30', 'stat.df'), '50.742007');
t('chi-square GOF', g6('χ2GOF {30,14,34,45,57,20},{20,20,30,40,60,30},5', 'stat.χ2'), '11.441667');
t('chi-square two-way', g6('χ22way [[10,20],[30,40]]', 'stat.χ2'), '0.793651');
t('LinRegtTest slope t', g6('LinRegtTest {1,2,3,4,5},{2.1,4.2,5.9,8.1,9.9}', 'stat.t'), '49.265887');
t('ANOVA F', g6('ANOVA {1,2,3},{4,5,6},{7,8,9}', 'stat.F'), '27.000000');

group('stat.* variables persist');
t('stat.v readable after OneVar', (evaluate('OneVar {1,2,3,4,5,6,7,8}'), evaluate('stat.v')), '4.5');
t('stat.n readable', evaluate('stat.n'), '8.');
