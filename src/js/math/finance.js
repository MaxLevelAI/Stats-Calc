// Time value of money, amortization and cash flows.
//
// Argument order and sign convention follow the CAS Reference Guide:
//   tvmFV(N,I,PV,Pmt,[PpY],[CpY],[PmtAt])
// I is a percentage per year, PpY payments per year, CpY compounding periods
// per year, and PmtAt is 0 for end-of-period or 1 for beginning.
//
// Money paid out is negative and money received positive, so a loan taken out
// has a positive PV and negative payments.

const ratePerPeriod = (I, PpY, CpY) => {
  if (I === 0) return 0;
  const i = I / 100 / CpY;
  return (1 + i) ** (CpY / PpY) - 1;
};

/** Present-value factor for an annuity of N payments at rate i. */
function annuity(i, n, due) {
  if (Math.abs(i) < 1e-12) return n;
  return ((1 - (1 + i) ** -n) / i) * (due ? 1 + i : 1);
}

export function tvmFV(N, I, PV, Pmt, PpY = 12, CpY = PpY, PmtAt = 0) {
  const i = ratePerPeriod(I, PpY, CpY);
  if (Math.abs(i) < 1e-12) return -(PV + Pmt * N);
  const g = (1 + i) ** N;
  return -(PV * g + Pmt * ((g - 1) / i) * (PmtAt ? 1 + i : 1));
}

export function tvmPV(N, I, Pmt, FV, PpY = 12, CpY = PpY, PmtAt = 0) {
  const i = ratePerPeriod(I, PpY, CpY);
  if (Math.abs(i) < 1e-12) return -(FV + Pmt * N);
  const g = (1 + i) ** N;
  return -(FV + Pmt * ((g - 1) / i) * (PmtAt ? 1 + i : 1)) / g;
}

export function tvmPmt(N, I, PV, FV, PpY = 12, CpY = PpY, PmtAt = 0) {
  const i = ratePerPeriod(I, PpY, CpY);
  if (Math.abs(i) < 1e-12) return -(PV + FV) / N;
  const g = (1 + i) ** N;
  return -(PV * g + FV) / (((g - 1) / i) * (PmtAt ? 1 + i : 1));
}

export function tvmN(I, PV, Pmt, FV, PpY = 12, CpY = PpY, PmtAt = 0) {
  const i = ratePerPeriod(I, PpY, CpY);
  if (Math.abs(i) < 1e-12) return -(PV + FV) / Pmt;
  const d = Pmt * (PmtAt ? 1 + i : 1);
  const num = d - FV * i;
  const den = d + PV * i;
  if (num / den <= 0) throw new Error('No solution');
  return Math.log(num / den) / Math.log(1 + i);
}

/** Interest rate per year, found by bisection on the balance equation. */
export function tvmI(N, PV, Pmt, FV, PpY = 12, CpY = PpY, PmtAt = 0) {
  const f = (rate) => tvmFV(N, rate, PV, Pmt, PpY, CpY, PmtAt) - FV;
  let lo = -99.9999;
  let hi = 1000;
  let flo = f(lo);
  if (flo * f(hi) > 0) throw new Error('No solution');
  for (let k = 0; k < 300; k += 1) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/* ------------------------------ amortization ------------------------------ */

/** Running balance after `n` payments. */
export function bal(n, N, I, PV, Pmt, PpY = 12, CpY = PpY, PmtAt = 0) {
  const i = ratePerPeriod(I, PpY, CpY);
  const pay = Pmt ?? tvmPmt(N, I, PV, 0, PpY, CpY, PmtAt);
  let b = PV;
  for (let k = 0; k < n; k += 1) b = b * (1 + i) + pay;
  return b;
}

/** Interest and principal paid between payments p1 and p2 inclusive. */
export function amortParts(p1, p2, N, I, PV, Pmt, PpY = 12, CpY = PpY, PmtAt = 0) {
  const i = ratePerPeriod(I, PpY, CpY);
  const pay = Pmt ?? tvmPmt(N, I, PV, 0, PpY, CpY, PmtAt);
  let b = PV;
  let interest = 0;
  let principal = 0;
  for (let k = 1; k <= p2; k += 1) {
    const int = b * i;
    const prin = pay + int;
    if (k >= p1) { interest += int; principal += prin; }
    b += int + pay;
  }
  return { interest, principal, balance: b };
}

export const sumInt = (...a) => amortParts(...a).interest;
export const sumPrn = (...a) => amortParts(...a).principal;

/** The amortization table TI prints: payment, interest, principal, balance. */
export function amortTbl(NPmt, N, I, PV, Pmt, PpY = 12, CpY = PpY, PmtAt = 0) {
  const i = ratePerPeriod(I, PpY, CpY);
  const pay = Pmt ?? tvmPmt(N, I, PV, 0, PpY, CpY, PmtAt);
  const out = [];
  let b = PV;
  for (let k = 1; k <= NPmt; k += 1) {
    const int = b * i;
    const prin = pay + int;
    b += int + pay;
    out.push([k, int, prin, b]);
  }
  return out;
}

/* ------------------------------ cash flows ------------------------------ */

export function npv(ratePct, cf0, flows, counts) {
  const i = ratePct / 100;
  let total = cf0;
  let period = 0;
  flows.forEach((cf, k) => {
    const reps = counts?.[k] ?? 1;
    for (let r = 0; r < reps; r += 1) {
      period += 1;
      total += cf / (1 + i) ** period;
    }
  });
  return total;
}

export function irr(cf0, flows, counts) {
  const f = (rate) => npv(rate, cf0, flows, counts);
  let lo = -99.99;
  let hi = 1000;
  let flo = f(lo);
  if (flo * f(hi) > 0) throw new Error('No solution');
  for (let k = 0; k < 300; k += 1) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/** Modified internal rate of return, with separate finance and reinvest rates. */
export function mirr(financePct, reinvestPct, cf0, flows, counts) {
  const fr = financePct / 100;
  const rr = reinvestPct / 100;
  const all = [cf0];
  flows.forEach((cf, k) => {
    const reps = counts?.[k] ?? 1;
    for (let r = 0; r < reps; r += 1) all.push(cf);
  });
  const n = all.length - 1;
  let pvNeg = 0;
  let fvPos = 0;
  all.forEach((cf, t) => {
    if (cf < 0) pvNeg += cf / (1 + fr) ** t;
    else fvPos += cf * (1 + rr) ** (n - t);
  });
  if (pvNeg === 0) throw new Error('No solution');
  return ((fvPos / -pvNeg) ** (1 / n) - 1) * 100;
}

/* ------------------------------ interest conversion ------------------------------ */

export const eff = (nominalPct, CpY) => ((1 + nominalPct / 100 / CpY) ** CpY - 1) * 100;

export const nom = (effectivePct, CpY) => ((1 + effectivePct / 100) ** (1 / CpY) - 1) * CpY * 100;

/* ------------------------------ dates ------------------------------ */

/** Days between two dates given as MM.DDYY or DDMM.YY numbers, per TI. */
export function dbd(d1, d2) {
  const toDate = (v) => {
    const s = v.toFixed(4);
    const [whole, frac] = s.split('.');
    const mm = Number(whole);
    const dd = Number(frac.slice(0, 2));
    const yy = Number(frac.slice(2, 4));
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return Date.UTC(year, mm - 1, dd);
  };
  return Math.round((toDate(d2) - toDate(d1)) / 86400000);
}
