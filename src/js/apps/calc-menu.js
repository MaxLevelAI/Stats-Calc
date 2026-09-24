// Calculator application menu tree.
//
// Top level and every first-level submenu are VERIFIED against TI
// documentation: the nine top-level entries (item 9, Functions & Programs,
// appears in TI's own Calculator menu screenshot), plus Actions, Number,
// Algebra, Calculus, Probability (incl. Random and all 18 Distributions),
// Statistics (Stat Calculations, List Math, List Operations, Confidence
// Intervals, Stat Tests), Matrix & Vector and Finance, with TI's exact labels
// and 1-9/A-I numbering.
//
// A few *second*-level submenus are reconstructed from the CAS Reference
// Guide's documented function set; their contents are right, their ordering is
// a best reconstruction. They are marked RECONSTRUCTED below.
//
// `ins` is the text inserted at the cursor; `|` marks where the caret lands.
// `wizard` names a dialog in wizards.js instead of inserting text.

const D = (k, label, ins) => ({ k, label, ins });
const S = (k, label, sub) => ({ k, label, sub });
const W = (k, label, wizard) => ({ k, label, wizard });

/* ---------------- shared statistics lists (also used by Lists & Spreadsheet) ---------------- */

export const DISTRIBUTIONS = [
  D('1', 'Normal Pdf', 'normPdf(|)'),
  D('2', 'Normal Cdf', 'normCdf(|)'),
  D('3', 'Inverse Normal', 'invNorm(|)'),
  D('4', 't Pdf', 'tPdf(|)'),
  D('5', 't Cdf', 'tCdf(|)'),
  D('6', 'Inverse t', 'invt(|)'),
  D('7', 'χ² Pdf', 'χ²Pdf(|)'),
  D('8', 'χ² Cdf', 'χ²Cdf(|)'),
  D('9', 'Inverse χ²', 'invχ²(|)'),
  D('A', 'F Pdf', 'FPdf(|)'),
  D('B', 'F Cdf', 'FCdf(|)'),
  D('C', 'Inverse F', 'invF(|)'),
  D('D', 'Binomial Pdf', 'binomPdf(|)'),
  D('E', 'Binomial Cdf', 'binomCdf(|)'),
  D('F', 'Geometric Pdf', 'geomPdf(|)'),
  D('G', 'Geometric Cdf', 'geomCdf(|)'),
  D('H', 'Poisson Pdf', 'poissPdf(|)'),
  D('I', 'Poisson Cdf', 'poissCdf(|)'),
];

export const STAT_CALCS = [
  W('1', 'One-Variable Statistics', 'OneVar'),
  W('2', 'Two-Variable Statistics', 'TwoVar'),
  W('3', 'Linear Regression (mx+b)', 'LinRegMx'),
  W('4', 'Linear Regression (a+bx)', 'LinRegBx'),
  W('5', 'Median-Median Line', 'MedMed'),
  W('6', 'Quadratic Regression', 'QuadReg'),
  W('7', 'Cubic Regression', 'CubicReg'),
  W('8', 'Quartic Regression', 'QuartReg'),
  W('9', 'Power Regression', 'PowerReg'),
  W('A', 'Exponential Regression', 'ExpReg'),
  W('B', 'Logarithmic Regression', 'LnReg'),
  D('C', 'Sinusoidal Regression', 'SinReg |'),
  D('D', 'Logistic Regression (d=0)', 'Logistic |'),
  D('E', 'Logistic Regression (d≠0)', 'LogisticD |'),
  D('F', 'Multiple Linear Regression', 'MultReg |'),
  D('G', 'Correlation Matrix', 'corrMat(|)'),
];

export const CONF_INTERVALS = [
  W('1', 'z Interval', 'zInterval'),
  W('2', 't Interval', 'tInterval'),
  W('3', '2-Sample z Interval', 'zInterval_2Samp'),
  W('4', '2-Sample t Interval', 'tInterval_2Samp'),
  W('5', '1-Prop z Interval', 'zInterval_1Prop'),
  W('6', '2-Prop z Interval', 'zInterval_2Prop'),
  W('7', 'Linear Reg t Intervals', 'LinRegtIntervals'),
  D('8', 'Multiple Reg Intervals', 'MultRegIntervals |'),
];

export const STAT_TESTS = [
  W('1', 'z Test', 'zTest'),
  W('2', 't Test', 'tTest'),
  W('3', '2-Sample z Test', 'zTest_2Samp'),
  W('4', '2-Sample t Test', 'tTest_2Samp'),
  W('5', '1-Prop z Test', 'zTest_1Prop'),
  W('6', '2-Prop z Test', 'zTest_2Prop'),
  W('7', 'χ² GOF Test', 'χ²GOF'),
  W('8', 'χ² 2-way Test', 'χ²2way'),
  W('9', '2-Sample F Test', 'Test_2S'),
  W('A', 'Linear Reg t Test', 'LinRegtTest'),
  D('B', 'Multiple Reg Tests', 'MultRegTests |'),
  W('C', 'ANOVA', 'ANOVA'),
  D('D', 'ANOVA 2-Way', 'ANOVA2way |'),
];

export const LIST_MATH = [
  D('1', 'Minimum', 'min(|)'),
  D('2', 'Maximum', 'max(|)'),
  D('3', 'Mean', 'mean(|)'),
  D('4', 'Median', 'median(|)'),
  D('5', 'Sum of Elements', 'sum(|)'),
  D('6', 'Product of Elements', 'product(|)'),
  D('7', 'Sample Standard Deviation', 'stDevSamp(|)'),
  D('8', 'Sample Variance', 'varSamp(|)'),
  D('9', 'Population Standard Deviation', 'stDevPop(|)'),
  D('A', 'Population Variance', 'varPop(|)'),
];

export const LIST_OPS = [
  D('1', 'Sort Ascending', 'SortA |'),
  D('2', 'Sort Descending', 'SortD |'),
  D('3', 'Cumulative Sum List', 'cumulativeSum(|)'),
  D('4', 'Fill', 'Fill |'),
  D('5', 'Sequence', 'seq(|,n,1,10)'),
  D('6', 'Difference List', 'ΔList(|)'),
  D('7', 'Augment', 'augment(|)'),
  D('8', 'Convert List to Matrix', 'list►mat(|)'),
  D('9', 'Convert Matrix to List', 'mat►list(|)'),
  D('A', 'Left', 'left(|)'),
  D('B', 'Mid', 'mid(|)'),
  D('C', 'Right', 'right(|)'),
];

/* ---------------- the Calculator menu ---------------- */

export const CALC_MENU = [
  S('1', 'Actions', [
    D('1', 'Define', 'Define |'),
    D('2', 'Recall Definition', 'Recall |'),
    D('3', 'Delete Variable', 'DelVar |'),
    D('4', 'Clear a–z', 'ClearAZ'),
    D('5', 'Clear History', '\u0000clearHistory'),
    D('6', 'Insert Comment', '©|'),
    S('7', 'Library', [ // RECONSTRUCTED
      D('1', 'Refresh Libraries', 'RefreshProbeVars'),
      D('2', 'Library Shortcut', 'libShortcut(|)'),
    ]),
    S('8', 'Lock', [ // RECONSTRUCTED
      D('1', 'Lock Variable', 'Lock |'),
      D('2', 'Unlock Variable', 'unLock |'),
      D('3', 'Lock Info', 'getLockInfo(|)'),
    ]),
  ]),

  S('2', 'Number', [
    D('1', 'Convert to Decimal', '|►Decimal'),
    D('2', 'Approximate to Fraction', '|►approxFraction()'),
    D('3', 'Factor', 'factor(|)'),
    D('4', 'Least Common Multiple', 'lcm(|)'),
    D('5', 'Greatest Common Divisor', 'gcd(|)'),
    D('6', 'Remainder', 'remain(|)'),
    S('7', 'Fraction Tools', [ // RECONSTRUCTED
      D('1', 'Proper Fraction', 'propFrac(|)'),
      D('2', 'Common Denominator', 'comDenom(|)'),
      D('3', 'Get Numerator', 'getNum(|)'),
      D('4', 'Get Denominator', 'getDenom(|)'),
    ]),
    S('8', 'Number Tools', [ // RECONSTRUCTED
      D('1', 'Round', 'round(|)'),
      D('2', 'Integer Part', 'iPart(|)'),
      D('3', 'Fractional Part', 'fPart(|)'),
      D('4', 'Sign', 'sign(|)'),
      D('5', 'Floor', 'floor(|)'),
      D('6', 'Ceiling', 'ceiling(|)'),
      D('7', 'Minimum', 'min(|)'),
      D('8', 'Maximum', 'max(|)'),
      D('9', 'Exact', 'exact(|)'),
      D('A', 'Approximate', 'approx(|)'),
    ]),
    S('9', 'Complex Number Tools', [ // RECONSTRUCTED
      D('1', 'Complex Conjugate', 'conj(|)'),
      D('2', 'Real Part', 'real(|)'),
      D('3', 'Imaginary Part', 'imag(|)'),
      D('4', 'Polar Angle', 'angle(|)'),
      D('5', 'Magnitude', 'abs(|)'),
      D('6', 'Convert to Polar', '|►Polar'),
      D('7', 'Convert to Rectangular', '|►Rect'),
    ]),
  ]),

  S('3', 'Algebra', [
    D('1', 'Solve', 'solve(|,x)'),
    D('2', 'Factor', 'factor(|)'),
    D('3', 'Expand', 'expand(|)'),
    D('4', 'Zeros', 'zeros(|,x)'),
    D('5', 'Complete the Square', 'completeSquare(|,x)'),
    D('6', 'Numerical Solve', 'nSolve(|,x)'),
    S('7', 'Solve System of Equations', [ // RECONSTRUCTED
      D('1', 'Solve System of Equations', 'system(|)'),
      D('2', 'Solve System of Linear Equations', 'linSolve(|)'),
    ]),
    S('8', 'Polynomial Tools', [ // RECONSTRUCTED
      D('1', 'Remainder of Polynomial', 'polyRemainder(|)'),
      D('2', 'Quotient of Polynomial', 'polyQuotient(|)'),
      D('3', 'Greatest Common Divisor', 'polyGcd(|)'),
      D('4', 'Coefficients of Polynomial', 'polyCoeffs(|)'),
      D('5', 'Degree of Polynomial', 'polyDegree(|)'),
      D('6', 'Roots of Polynomial', 'polyRoots(|)'),
      D('7', 'Complex Roots of Polynomial', 'cPolyRoots(|)'),
    ]),
    S('9', 'Fraction Tools', [ // RECONSTRUCTED
      D('1', 'Proper Fraction', 'propFrac(|)'),
      D('2', 'Common Denominator', 'comDenom(|)'),
      D('3', 'Get Numerator', 'getNum(|)'),
      D('4', 'Get Denominator', 'getDenom(|)'),
    ]),
    S('A', 'Convert Expression', [ // RECONSTRUCTED
      D('1', 'Convert to logbase', '|►logbase()'),
      D('2', 'Convert to sin', '|►sin'),
      D('3', 'Convert to cos', '|►cos'),
      D('4', 'Convert to exp', '|►exp'),
      D('5', 'Convert to ln', '|►ln'),
    ]),
    S('B', 'Trigonometry', [
      D('1', 'Expand', 'tExpand(|)'),
      D('2', 'Collect', 'tCollect(|)'),
    ]),
    S('C', 'Complex', [
      D('1', 'Solve', 'cSolve(|,x)'),
      D('2', 'Factor', 'cFactor(|)'),
      D('3', 'Zeros', 'cZeros(|,x)'),
    ]),
    S('D', 'Extract', [ // RECONSTRUCTED
      D('1', 'Numerator', 'getNum(|)'),
      D('2', 'Denominator', 'getDenom(|)'),
      D('3', 'Left', 'left(|)'),
      D('4', 'Right', 'right(|)'),
    ]),
  ]),

  S('4', 'Calculus', [
    D('1', 'Derivative', 'derivative(|,x)'),
    D('2', 'Derivative at a Point', 'derivative(|,x)'),
    D('3', 'Integral', 'integral(|,x)'),
    D('4', 'Limit', 'limit(|,x,0)'),
    D('5', 'Sum', 'sum(seq(|,n,1,10))'),
    D('6', 'Product', 'product(seq(|,n,1,10))'),
    D('7', 'Function Minimum', 'fMin(|,x)'),
    D('8', 'Function Maximum', 'fMax(|,x)'),
    D('9', 'Tangent Line', 'tangentLine(|,x,0)'),
    D('A', 'Normal Line', 'normalLine(|,x,0)'),
    D('B', 'Arc Length', 'arcLen(|,x,0,1)'),
    S('C', 'Series', [
      D('1', 'Taylor Polynomial', 'taylor(|,x,4)'),
      D('2', 'Generalized Series', 'series(|,x,4)'),
      D('3', 'Dominant Term', 'dominantTerm(|,x)'),
    ]),
    D('D', 'Differential Equation Solver', 'deSolve(|,x,y)'),
    D('E', 'Implicit Differentiation', 'impDif(|,x,y)'),
    S('F', 'Numerical Calculations', [ // RECONSTRUCTED
      D('1', 'Numerical Derivative at a Point', 'nDeriv(|,x)'),
      D('2', 'Numerical Integral', 'nInt(|,x,0,1)'),
      D('3', 'Numerical Function Minimum', 'nfMin(|,x)'),
      D('4', 'Numerical Function Maximum', 'nfMax(|,x)'),
      D('5', 'Central Difference', 'centralDiff(|,x)'),
    ]),
  ]),

  S('5', 'Probability', [
    D('1', 'Factorial (!)', '|!'),
    D('2', 'Permutations', 'nPr(|)'),
    D('3', 'Combinations', 'nCr(|)'),
    S('4', 'Random', [
      D('1', 'Number', 'rand(|)'),
      D('2', 'Integer', 'randInt(|)'),
      D('3', 'Binomial', 'randBin(|)'),
      D('4', 'Normal', 'randNorm(|)'),
      D('5', 'Sample', 'randSamp(|)'),
      D('6', 'Seed', 'RandSeed |'),
    ]),
    S('5', 'Distributions', DISTRIBUTIONS),
  ]),

  S('6', 'Statistics', [
    S('1', 'Stat Calculations', STAT_CALCS),
    D('2', 'Stat Results', 'stat.results'),
    S('3', 'List Math', LIST_MATH),
    S('4', 'List Operations', LIST_OPS),
    S('5', 'Distributions', DISTRIBUTIONS),
    S('6', 'Confidence Intervals', CONF_INTERVALS),
    S('7', 'Stat Tests', STAT_TESTS),
  ]),

  S('7', 'Matrix & Vector', [
    S('1', 'Create', [ // RECONSTRUCTED
      D('1', 'Matrix', '[[|]]'),
      D('2', 'Zero Matrix', 'newMat(|)'),
      D('3', 'Identity', 'identity(|)'),
      D('4', 'Diagonal', 'diag(|)'),
      D('5', 'Random Matrix', 'randMat(|)'),
      D('6', 'Fill', 'Fill |'),
      D('7', 'Submatrix', 'subMat(|)'),
      D('8', 'Augment', 'augment(|)'),
      D('9', 'Column Augment', 'colAugment(|)'),
      D('A', 'Construct Matrix', 'constructMat(|)'),
    ]),
    D('2', 'Transpose', '|ᵀ'),
    D('3', 'Determinant', 'det(|)'),
    D('4', 'Row-Echelon Form', 'ref(|)'),
    D('5', 'Reduced Row-Echelon Form', 'rref(|)'),
    D('6', 'Simultaneous', 'simult(|)'),
    S('7', 'Norms', [ // RECONSTRUCTED
      D('1', 'Matrix Norm', 'norm(|)'),
      D('2', 'Row Norm', 'rowNorm(|)'),
      D('3', 'Column Norm', 'colNorm(|)'),
    ]),
    S('8', 'Dimensions', [ // RECONSTRUCTED
      D('1', 'Number of Rows', 'rowDim(|)'),
      D('2', 'Number of Columns', 'colDim(|)'),
      D('3', 'Dimension', 'dim(|)'),
    ]),
    S('9', 'Row Operations', [ // RECONSTRUCTED
      D('1', 'Swap Rows', 'rowSwap(|)'),
      D('2', 'Row Addition', 'rowAdd(|)'),
      D('3', 'Multiply Row', 'mRow(|)'),
      D('4', 'Multiply and Add Row', 'mRowAdd(|)'),
    ]),
    S('A', 'Element Operations', [ // RECONSTRUCTED
      D('1', 'Cumulative Sum', 'cumulativeSum(|)'),
      D('2', 'Row Sums', 'sum(|)'),
      D('3', 'Product', 'product(|)'),
    ]),
    S('B', 'Advanced', [ // RECONSTRUCTED
      D('1', 'Trace', 'trace(|)'),
      D('2', 'LU Decomposition', 'LU |'),
      D('3', 'QR Decomposition', 'QR |'),
      D('4', 'Eigenvalues', 'eigVl(|)'),
      D('5', 'Eigenvectors', 'eigVc(|)'),
      D('6', 'Characteristic Polynomial', 'charPoly(|)'),
    ]),
    S('C', 'Vector', [ // RECONSTRUCTED
      D('1', 'Unit Vector', 'unitV(|)'),
      D('2', 'Cross Product', 'crossP(|)'),
      D('3', 'Dot Product', 'dotP(|)'),
      D('4', 'Convert to Cylindrical', '|►Cylind'),
      D('5', 'Convert to Spherical', '|►Sphere'),
    ]),
  ]),

  S('8', 'Finance', [
    D('1', 'Finance Solver', '\u0000financeSolver'),
    S('2', 'TVM Functions', [
      D('1', 'Number of Payments', 'tvmN(|)'),
      D('2', 'Interest Rate', 'tvmI(|)'),
      D('3', 'Present Value', 'tvmPV(|)'),
      D('4', 'Payment Amount', 'tvmPmt(|)'),
      D('5', 'Future Value', 'tvmFV(|)'),
    ]),
    S('3', 'Amortization', [ // RECONSTRUCTED
      D('1', 'Amortization Table', 'amortTbl(|)'),
      D('2', 'Balance', 'bal(|)'),
      D('3', 'Sum of Interest', 'ΣInt(|)'),
      D('4', 'Sum of Principal', 'ΣPrn(|)'),
    ]),
    S('4', 'Cash Flows', [ // RECONSTRUCTED
      D('1', 'Net Present Value', 'npv(|)'),
      D('2', 'Internal Rate of Return', 'irr(|)'),
      D('3', 'Modified Internal Rate of Return', 'mirr(|)'),
    ]),
    S('5', 'Interest Conversion', [ // RECONSTRUCTED
      D('1', 'Effective Rate', 'eff(|)'),
      D('2', 'Nominal Rate', 'nom(|)'),
    ]),
    D('6', 'Days between Dates', 'dbd(|)'),
  ]),

  S('9', 'Functions & Programs', [ // leaves RECONSTRUCTED
    S('1', 'Program Editor', [
      D('1', 'New', '\u0000progNew'),
      D('2', 'Open', '\u0000progOpen'),
      D('3', 'Import', '\u0000progImport'),
    ]),
    D('2', 'Define', 'Define |'),
    D('3', 'Func...EndFunc', 'Func\n|\nEndFunc'),
    D('4', 'Prgm...EndPrgm', 'Prgm\n|\nEndPrgm'),
    D('5', 'Local', 'Local |'),
    S('6', 'Control', [
      D('1', 'If', 'If |'),
      D('2', 'If...Then...EndIf', 'If |Then\n\nEndIf'),
      D('3', 'If...Then...Else...EndIf', 'If |Then\n\nElse\n\nEndIf'),
      D('4', 'ElseIf...Then', 'ElseIf |Then'),
      D('5', 'For...EndFor', 'For |,1,10\n\nEndFor'),
      D('6', 'While...EndWhile', 'While |\n\nEndWhile'),
      D('7', 'Loop...EndLoop', 'Loop\n|\nEndLoop'),
      D('8', 'Try...Else...EndTry', 'Try\n|\nElse\n\nEndTry'),
    ]),
    S('7', 'Transfer', [
      D('1', 'Return', 'Return |'),
      D('2', 'Cycle', 'Cycle'),
      D('3', 'Exit', 'Exit'),
      D('4', 'Goto', 'Goto |'),
      D('5', 'Lbl', 'Lbl |'),
      D('6', 'Stop', 'Stop'),
    ]),
    S('8', 'I/O', [
      D('1', 'Disp', 'Disp |'),
      D('2', 'Request', 'Request "|",'),
      D('3', 'RequestStr', 'RequestStr "|",'),
      D('4', 'Text', 'Text "|"'),
      D('5', 'DispAt', 'DispAt |'),
    ]),
    S('9', 'Mode', [
      D('1', 'Set Mode', 'setMode(|)'),
      D('2', 'Get Mode', 'getMode(|)'),
    ]),
  ]),

  // Every handheld application menu ends with a separated Hints entry.
  { k: 'A', label: 'Hints', ins: '\u0000hints', sep: true },
];
