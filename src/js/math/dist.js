// Statistical distributions.
//
// Argument order and defaults follow the CAS Reference Guide exactly:
//   normPdf(XVal[,mu[,sigma]])        normCdf(lowBound,upBound[,mu[,sigma]])
//   invNorm(Area[,mu[,sigma]])        tPdf(XVal,df)   tCdf(low,up,df)
//   invt(Area,df)                     chi2Pdf(XVal,df) chi2Cdf(low,up,df)
//   FPdf(XVal,dfNumer,dfDenom)        FCdf(low,up,dfNumer,dfDenom)
//   binomPdf(n,p[,XVal])              binomCdf(n,p[,low,up])
//   geomPdf(p,XVal)                   geomCdf(p,low,up)
//   poissPdf(lambda,XVal)             poissCdf(lambda,low,up)

/* ------------------------------ special functions ------------------------------ */

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lgamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < LANCZOS.length; i += 1) x += LANCZOS[i] / (z + i + 1);
  const t = z + LANCZOS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularised lower incomplete gamma P(a, x). */
export function gammaP(a, x) {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) {
    // series expansion
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 1000; n += 1) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  // continued fraction for Q(a,x)
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

/** Regularised incomplete beta I_x(a, b). */
export function betaI(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // the leading factor is symmetric under (a,b,x) -> (b,a,1-x)
  const front = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betacf(a, b, x)) / a
    : 1 - (front * betacf(b, a, 1 - x)) / b;
}

function betacf(a, b, x) {
  const tiny = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 500; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

export const erf = (x) => (x < 0 ? -gammaP(0.5, x * x) : gammaP(0.5, x * x));

/** Solve cdf(v) = target by bisection on a bracketing interval. */
function invert(cdf, target, lo, hi) {
  if (!(target > 0) || !(target < 1)) {
    if (target === 0) return lo;
    if (target === 1) return hi;
    return NaN;
  }
  let a = lo;
  let b = hi;
  for (let i = 0; i < 300; i += 1) {
    const m = (a + b) / 2;
    if (cdf(m) < target) a = m; else b = m;
  }
  return (a + b) / 2;
}

/* ------------------------------ normal ------------------------------ */

export const normPdf = (x, mu = 0, sd = 1) =>
  Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));

export const stdNormCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

export const normCdf = (lo, hi, mu = 0, sd = 1) =>
  stdNormCdf((hi - mu) / sd) - stdNormCdf((lo - mu) / sd);

export function invNorm(area, mu = 0, sd = 1) {
  if (area <= 0 || area >= 1) return area <= 0 ? -Infinity : Infinity;
  // Acklam's rational approximation, then two Newton steps
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];
  const pl = 0.02425;
  let z;
  if (area < pl) {
    const q = Math.sqrt(-2 * Math.log(area));
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (area <= 1 - pl) {
    const q = area - 0.5;
    const r = q * q;
    z = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - area));
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  for (let i = 0; i < 3; i += 1) {
    const err = stdNormCdf(z) - area;
    z -= err / normPdf(z);
  }
  return mu + sd * z;
}

/* ------------------------------ Student's t ------------------------------ */

export const tPdf = (x, df) =>
  Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) /
  Math.sqrt(df * Math.PI) * (1 + (x * x) / df) ** (-(df + 1) / 2);

export function tCdfLower(x, df) {
  const z = df / (df + x * x);
  const half = 0.5 * betaI(df / 2, 0.5, z);
  return x >= 0 ? 1 - half : half;
}

export const tCdf = (lo, hi, df) => tCdfLower(hi, df) - tCdfLower(lo, df);

export const invT = (area, df) => invert((v) => tCdfLower(v, df), area, -1e4, 1e4);

/* ------------------------------ chi-squared ------------------------------ */

export const chi2Pdf = (x, df) =>
  x <= 0 ? 0 : Math.exp((df / 2 - 1) * Math.log(x) - x / 2 - lgamma(df / 2) - (df / 2) * Math.LN2);

export const chi2CdfLower = (x, df) => (x <= 0 ? 0 : gammaP(df / 2, x / 2));

export const chi2Cdf = (lo, hi, df) => chi2CdfLower(hi, df) - chi2CdfLower(lo, df);

export const invChi2 = (area, df) => invert((v) => chi2CdfLower(v, df), area, 0, 1e6);

/* ------------------------------ F ------------------------------ */

export function FPdf(x, d1, d2) {
  if (x <= 0) return 0;
  const lnNum = (d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x) -
    ((d1 + d2) / 2) * Math.log(1 + (d1 * x) / d2);
  return Math.exp(lnNum - (lgamma(d1 / 2) + lgamma(d2 / 2) - lgamma((d1 + d2) / 2)));
}

export const FCdfLower = (x, d1, d2) =>
  x <= 0 ? 0 : betaI(d1 / 2, d2 / 2, (d1 * x) / (d1 * x + d2));

export const FCdf = (lo, hi, d1, d2) => FCdfLower(hi, d1, d2) - FCdfLower(lo, d1, d2);

export const invF = (area, d1, d2) => invert((v) => FCdfLower(v, d1, d2), area, 0, 1e6);

/* ------------------------------ discrete ------------------------------ */

const lnChoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

export function binomPdf(n, p, x) {
  if (x < 0 || x > n || !Number.isInteger(x)) return 0;
  if (p === 0) return x === 0 ? 1 : 0;
  if (p === 1) return x === n ? 1 : 0;
  return Math.exp(lnChoose(n, x) + x * Math.log(p) + (n - x) * Math.log(1 - p));
}

export function binomCdf(n, p, lo = 0, hi = n) {
  let s = 0;
  for (let x = Math.max(0, Math.ceil(lo)); x <= Math.min(n, Math.floor(hi)); x += 1) {
    s += binomPdf(n, p, x);
  }
  return s;
}

export const geomPdf = (p, x) =>
  (x < 1 || !Number.isInteger(x) ? 0 : p * (1 - p) ** (x - 1));

export function geomCdf(p, lo = 1, hi = Infinity) {
  const a = Math.max(1, Math.ceil(lo));
  if (!Number.isFinite(hi)) return (1 - p) ** (a - 1);
  let s = 0;
  for (let x = a; x <= Math.floor(hi); x += 1) s += geomPdf(p, x);
  return s;
}

export const poissPdf = (lambda, x) =>
  (x < 0 || !Number.isInteger(x) ? 0 : Math.exp(-lambda + x * Math.log(lambda) - lgamma(x + 1)));

export function poissCdf(lambda, lo = 0, hi = Infinity) {
  const a = Math.max(0, Math.ceil(lo));
  if (!Number.isFinite(hi)) return 1 - (a === 0 ? 0 : gammaP(a, lambda));
  let s = 0;
  for (let x = a; x <= Math.floor(hi); x += 1) s += poissPdf(lambda, x);
  return s;
}
