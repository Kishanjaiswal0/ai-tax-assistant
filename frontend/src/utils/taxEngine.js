// src/utils/taxEngine.js - Client-side tax engine (instant UI calculations)

export const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const fmtK = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : fmt(n);

const oldTax = (income, age) => {
  const ex = age === 'above80' ? 500000 : age === '60to80' ? 300000 : 250000;
  const net = Math.max(0, income - ex);
  if (!net) return 0;
  let t = 0;
  if (net <= 250000)      t = net * 0.05;
  else if (net <= 500000) t = 12500  + (net - 250000) * 0.20;
  else if (net <= 750000) t = 112500 + (net - 500000) * 0.20;
  else if (net <= 1000000)t = 162500 + (net - 750000) * 0.20;
  else if (net <= 1250000)t = 212500 + (net - 1000000)* 0.30;
  else if (net <= 1500000)t = 287500 + (net - 1250000)* 0.30;
  else                    t = 362500 + (net - 1500000)* 0.30;
  if (income <= 500000) t = Math.max(0, t - 12500);
  return Math.round(t * 1.04); // + cess
};

const newTax = (income) => {
  const net = Math.max(0, income - 75000); // std deduction
  if (net <= 700000) return 0;             // 87A rebate
  let t = 0;
  if (net <= 300000)       t = 0;
  else if (net <= 700000)  t = (net - 300000) * 0.05;
  else if (net <= 1000000) t = 20000 + (net - 700000) * 0.10;
  else if (net <= 1200000) t = 50000 + (net - 1000000)* 0.15;
  else if (net <= 1500000) t = 80000 + (net - 1200000)* 0.20;
  else                     t = 140000+ (net - 1500000)* 0.30;
  return Math.round(t * 1.04);
};

export const calcTax = (income, age = 'below60', deductions = {}) => {
  const s80C    = Math.min(deductions.section80C || 0, 150000);
  const s80D    = Math.min(deductions.section80D || 0, 50000);
  const nps     = Math.min(deductions.nps        || 0, 50000);
  const hra     = deductions.hra                 || 0;
  const home    = Math.min(deductions.homeLoan   || 0, 200000);
  const stdDed  = deductions.standardDeduction  ?? 50000;
  const totalDed = s80C + s80D + nps + hra + home + stdDed;

  const oldTaxable = Math.max(0, income - totalDed);
  const newTaxable = Math.max(0, income - 75000);

  const oldT = oldTax(oldTaxable, age);
  const newT = newTax(newTaxable);
  const rec  = oldT <= newT ? 'old' : 'new';

  return {
    grossIncome: income,
    totalDeductions: totalDed,
    oldRegime: { taxable: oldTaxable, tax: oldT, rate: income ? +((oldT/income)*100).toFixed(1) : 0 },
    newRegime: { taxable: newTaxable, tax: newT, rate: income ? +((newT/income)*100).toFixed(1) : 0 },
    recommended: rec,
    savings: Math.abs(oldT - newT)
  };
};
