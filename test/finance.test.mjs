// Values checked against standard time-value-of-money worked examples.
import { t, group } from './harness.mjs';
import * as F from '../src/js/math/finance.js';
import { evaluate } from '../src/js/math/engine.js';

const c = (v) => (Math.round(v * 100) / 100).toFixed(2);
const e = (src) => { try { return evaluate(src); } catch (err) { return `ERR: ${err.message}`; } };

group('time value of money');
t('30-year 200k mortgage at 6% pays 1199.10',
  c(F.tvmPmt(360, 6, 200000, 0, 12, 12)), '-1199.10');
t('and discounts back to the principal',
  c(F.tvmPV(360, 6, -1199.10, 0, 12, 12)), '199999.82');
t('100 a month for 10 years at 5%',
  c(F.tvmFV(120, 5, 0, -100, 12, 12)), '15528.23');
t('doubling in 10 years needs 7.18% a year',
  c(F.tvmI(10, -1000, 0, 2000, 1, 1)), '7.18');
t('doubling at 6% takes 11.90 years',
  c(F.tvmN(6, -1000, 0, 2000, 1, 1)), '11.90');
t('a zero rate just divides',
  c(F.tvmPmt(10, 0, 1000, 0, 1, 1)), '-100.00');

group('amortization');
// Cross-checked against the closed form B(n) = PV(1+i)^n + Pmt((1+i)^n - 1)/i,
// which agrees to the cent.
t('balance after 12 payments of a 30-year loan',
  c(F.bal(12, 360, 6, 200000, -1199.10, 12, 12)), '197543.99');
t('first year interest',
  c(F.sumInt(1, 12, 360, 6, 200000, -1199.10)), '11933.19');
t('first year principal',
  c(F.sumPrn(1, 12, 360, 6, 200000, -1199.10)), '-2456.01');
t('interest plus principal equals what was paid',
  c(F.sumInt(1, 12, 360, 6, 200000, -1199.10) - F.sumPrn(1, 12, 360, 6, 200000, -1199.10)),
  c(12 * 1199.10));
t('table has one row per payment',
  F.amortTbl(5, 360, 6, 200000, -1199.10, 12, 12).length, 5);

group('cash flows');
t('net present value',
  c(F.npv(10, -1000, [500, 500, 500])), '243.43');
t('internal rate of return',
  c(F.irr(-1000, [500, 500, 500])), '23.38');
t('npv is zero at the irr',
  c(F.npv(F.irr(-1000, [500, 500, 500]), -1000, [500, 500, 500])), '0.00');
t('grouped flows repeat',
  c(F.npv(10, -1000, [500], [3])), '243.43');

group('interest conversion');
t('6% nominal compounded monthly is 6.17% effective', c(F.eff(6, 12)), '6.17');
t('and converts back', c(F.nom(F.eff(6, 12), 12)), '6.00');
t('annual compounding is a no-op', c(F.eff(5, 1)), '5.00');

group('dates');
t('January to March 2006', F.dbd(1.0106, 3.0106), 59);
t('same day is zero', F.dbd(6.1506, 6.1506), 0);

group('reachable from the entry line');
t('tvmPmt', e('tvmPmt(360,6,200000,0,12,12)'), '-1199.1');
t('tvmFV', e('tvmFV(120,5,0,-100,12,12)'), '15528.23');
t('eff', e('eff(6,12)'), '6.17');
t('npv', e('npv(10,-1000,{500,500,500})'), '243.43');
t('dbd', e('dbd(1.0106,3.0106)'), '59.');
