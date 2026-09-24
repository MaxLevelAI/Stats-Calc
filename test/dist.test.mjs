// Distribution values checked against standard statistical tables.
import { t, group } from './harness.mjs';
import * as D from '../src/js/math/dist.js';
import { evaluate } from '../src/js/math/engine.js';

const f = (v, n = 6) => Number(v).toFixed(n);

group('normal');
t('stdNormCdf(0)', f(D.stdNormCdf(0)), '0.500000');
t('stdNormCdf(1.96)', f(D.stdNormCdf(1.96)), '0.975002');
t('normCdf(-1,1) = 68%', f(D.normCdf(-1, 1)), '0.682689');
t('normCdf(-2,2) = 95%', f(D.normCdf(-2, 2)), '0.954500');
t('invNorm(0.975)', f(D.invNorm(0.975)), '1.959964');
t('invNorm(0.05)', f(D.invNorm(0.05)), '-1.644854');
t('normPdf(0)', f(D.normPdf(0)), '0.398942');

group("Student's t");
t('invT(0.975,20)', f(D.invT(0.975, 20)), '2.085963');
t('invT(0.95,10)', f(D.invT(0.95, 10)), '1.812461');
t('invT(0.975,1)', f(D.invT(0.975, 1)), '12.706205');
t('tPdf(0,10)', f(D.tPdf(0, 10)), '0.389108');
t('tCdf round trip', f(D.tCdfLower(2.085963, 20)), '0.975000');

group('chi-squared and F');
t('invChi2(0.95,1)', f(D.invChi2(0.95, 1)), '3.841459');
t('invChi2(0.95,4)', f(D.invChi2(0.95, 4)), '9.487729');
t('invChi2(0.99,10)', f(D.invChi2(0.99, 10)), '23.209251');
t('invF(0.95,3,10)', f(D.invF(0.95, 3, 10)), '3.708265');
t('FCdf round trip', f(D.FCdfLower(3.708265, 3, 10)), '0.950000');

group('discrete');
t('binomPdf(10,0.5,5)', f(D.binomPdf(10, 0.5, 5)), '0.246094');
t('binomCdf(10,0.5,0,5)', f(D.binomCdf(10, 0.5, 0, 5)), '0.623047');
t('binomPdf(20,0.3,6)', f(D.binomPdf(20, 0.3, 6)), '0.191639');
t('geomPdf(0.3,3)', f(D.geomPdf(0.3, 3)), '0.147000');
t('poissPdf(2,3)', f(D.poissPdf(2, 3)), '0.180447');
t('poissCdf(2,0,3)', f(D.poissCdf(2, 0, 3)), '0.857123');

group('reachable from the entry line');
t('normCdf', evaluate('normCdf(-1E99,1.96)').slice(0, 8), '0.975002');
t('invNorm', evaluate('invNorm(0.975)').slice(0, 7), '1.95996');
t('chi-square by Greek name', evaluate('invχ²(0.95,1)').slice(0, 7), '3.84145');
t('binomPdf', evaluate('binomPdf(10,0.5,5)'), '0.24609375');
t('z-score tail', evaluate('normCdf(70,1E99,65,3)').slice(0, 8), '0.047790');
