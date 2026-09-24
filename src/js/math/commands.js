// Statement-style statistics commands, with TI's argument signatures.
//
// Most of them are polymorphic: given a list they work from data, given
// numbers they work from summary statistics. The reference guide spells both
// forms out, e.g.
//   tInterval List[,Freq[,CLevel]]   and   tInterval v,sx,n[,CLevel]

import * as ST from './stats.js';

const isList = (e) => e && e.k === 'list';

/** Hypoth: TI accepts -1 / 0 / 1 for Ha <, != and >. */
function hypOf(v) {
  if (v === undefined) return 0;
  return Math.sign(v);
}

/**
 * Each implementation receives ({ n, l, raw }) where
 *   n(i)   -> argument i as a number
 *   l(i)   -> argument i as an array of numbers
 *   raw[i] -> the untouched node, for list/summary dispatch
 */
export const COMMAND_IMPL = {
  /* ---- summaries ---- */
  onevar: ({ l, raw }) => ST.oneVar(l(0), raw[1] ? l(1) : null),
  twovar: ({ l, raw }) => ST.twoVar(l(0), l(1), raw[2] ? l(2) : null),

  /* ---- regressions ---- */
  linregbx: ({ l }) => ST.linRegBx(l(0), l(1)),
  linregmx: ({ l }) => ST.linRegMx(l(0), l(1)),
  medmed: ({ l }) => ST.medMed(l(0), l(1)),
  quadreg: ({ l }) => ST.polyReg(l(0), l(1), 2, ['a', 'b', 'c']),
  cubicreg: ({ l }) => ST.polyReg(l(0), l(1), 3, ['a', 'b', 'c', 'd']),
  quartreg: ({ l }) => ST.polyReg(l(0), l(1), 4, ['a', 'b', 'c', 'd', 'e']),
  expreg: ({ l }) => ST.transformedReg('ExpReg', l(0), l(1)),
  powerreg: ({ l }) => ST.transformedReg('PowerReg', l(0), l(1)),
  lnreg: ({ l }) => ST.transformedReg('LnReg', l(0), l(1)),

  /* ---- confidence intervals ---- */
  zinterval: ({ n, l, raw }) => (isList(raw[1])
    ? withList(l(1), (d) => ST.zInterval(n(0), mean(d), d.length, cl(raw, n, 2)))
    : ST.zInterval(n(0), n(1), n(2), raw[3] ? n(3) : 0.95)),

  tinterval: ({ n, l, raw }) => (isList(raw[0])
    ? withList(l(0), (d) => ST.tInterval(mean(d), sd(d), d.length, cl(raw, n, 1)))
    : ST.tInterval(n(0), n(1), n(2), raw[3] ? n(3) : 0.95)),

  zinterval_2samp: ({ n, l, raw }) => (isList(raw[2])
    ? ST.zInterval2Samp(n(0), n(1), mean(l(2)), l(2).length, mean(l(3)), l(3).length, cl(raw, n, 4))
    : ST.zInterval2Samp(n(0), n(1), n(2), n(3), n(4), n(5), raw[6] ? n(6) : 0.95)),

  tinterval_2samp: ({ n, l, raw }) => (isList(raw[0])
    ? ST.tInterval2Samp(mean(l(0)), sd(l(0)), l(0).length, mean(l(1)), sd(l(1)), l(1).length,
      cl(raw, n, 2), raw[3] ? n(3) > 0 : false)
    : ST.tInterval2Samp(n(0), n(1), n(2), n(3), n(4), n(5),
      raw[6] ? n(6) : 0.95, raw[7] ? n(7) > 0 : false)),

  zinterval_1prop: ({ n, raw }) => ST.zInterval1Prop(n(0), n(1), raw[2] ? n(2) : 0.95),
  zinterval_2prop: ({ n, raw }) => ST.zInterval2Prop(n(0), n(1), n(2), n(3), raw[4] ? n(4) : 0.95),
  linregtintervals: ({ n, l, raw }) => ST.linRegTInterval(l(0), l(1), raw[3] ? n(3) : 0.95),

  /* ---- hypothesis tests ---- */
  ztest: ({ n, l, raw }) => (isList(raw[2])
    ? withList(l(2), (d) => ST.zTest(n(0), n(1), mean(d), d.length, hypOf(raw[4] ? n(4) : undefined)))
    : ST.zTest(n(0), n(1), n(2), n(3), hypOf(raw[4] ? n(4) : undefined))),

  ttest: ({ n, l, raw }) => (isList(raw[1])
    ? withList(l(1), (d) => ST.tTest(n(0), mean(d), sd(d), d.length, hypOf(raw[3] ? n(3) : undefined)))
    : ST.tTest(n(0), n(1), n(2), n(3), hypOf(raw[4] ? n(4) : undefined))),

  ztest_2samp: ({ n, l, raw }) => (isList(raw[2])
    ? ST.zTest2Samp(n(0), n(1), mean(l(2)), l(2).length, mean(l(3)), l(3).length,
      hypOf(raw[6] ? n(6) : undefined))
    : ST.zTest2Samp(n(0), n(1), n(2), n(3), n(4), n(5), hypOf(raw[6] ? n(6) : undefined))),

  ttest_2samp: ({ n, l, raw }) => (isList(raw[0])
    ? ST.tTest2Samp(mean(l(0)), sd(l(0)), l(0).length, mean(l(1)), sd(l(1)), l(1).length,
      hypOf(raw[4] ? n(4) : undefined), raw[5] ? n(5) > 0 : false)
    : ST.tTest2Samp(n(0), n(1), n(2), n(3), n(4), n(5),
      hypOf(raw[6] ? n(6) : undefined), raw[7] ? n(7) > 0 : false)),

  ztest_1prop: ({ n, raw }) => ST.zTest1Prop(n(0), n(1), n(2), hypOf(raw[3] ? n(3) : undefined)),
  ztest_2prop: ({ n, raw }) => ST.zTest2Prop(n(0), n(1), n(2), n(3), hypOf(raw[4] ? n(4) : undefined)),

  linregttest: ({ n, l, raw }) => ST.linRegTTest(l(0), l(1), hypOf(raw[3] ? n(3) : undefined)),

  test_2s: ({ n, l, raw }) => (isList(raw[0])
    ? ST.fTest2Samp(sd(l(0)), l(0).length, sd(l(1)), l(1).length, hypOf(raw[4] ? n(4) : undefined))
    : ST.fTest2Samp(n(0), n(1), n(2), n(3), hypOf(raw[4] ? n(4) : undefined))),

  anova: ({ raw, toNums }) => ST.anova(raw.filter(isList).map(toNums)),
};

// chi-square commands, under both the Greek and ASCII spellings
COMMAND_IMPL['χ2gof'] = ({ n, l }) => ST.chi2GOF(l(0), l(1), n(2));
COMMAND_IMPL['χ22way'] = ({ raw, toNums }) => ST.chi2TwoWay(matrixOf(raw[0], toNums));
COMMAND_IMPL.chi2gof = COMMAND_IMPL['χ2gof'];
COMMAND_IMPL.chi22way = COMMAND_IMPL['χ22way'];

export const COMMANDS = new Set(Object.keys(COMMAND_IMPL));

/* ------------------------------ helpers ------------------------------ */

const mean = (d) => d.reduce((a, b) => a + b, 0) / d.length;
const sd = (d) => Math.sqrt(ST.varianceOf(d, 1));
const withList = (d, f) => f(d);

/** Confidence level, which always trails an optional Freq argument. */
function cl(raw, n, firstOptional) {
  for (let i = raw.length - 1; i >= firstOptional; i -= 1) {
    if (raw[i] && !isList(raw[i])) {
      const v = n(i);
      if (v > 0 && v < 1) return v;
    }
  }
  return 0.95;
}

function matrixOf(node, toNums) {
  if (!isList(node)) throw new Error('Expected a matrix');
  return node.items.map((row) => {
    if (!isList(row)) throw new Error('Expected a matrix');
    return toNums(row);
  });
}
