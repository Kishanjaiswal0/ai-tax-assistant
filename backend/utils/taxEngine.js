// utils/taxEngine.js
// Complete Indian Tax Calculation Engine (FY 2024-25) + Fuzzy Logic
// ============================================================

// ─── OLD REGIME TAX (FY 2024-25) ──────────────────────────────
const getOldRegimeBaseTax = (taxableIncome, age) => {
  // Basic exemption limits
  const exemption = age === 'above80' ? 500000 : age === '60to80' ? 300000 : 250000;
  const net = Math.max(0, taxableIncome - exemption);
  if (net === 0) return 0;

  let tax = 0;
  // Slabs after exemption
  if (net <= 250000)       tax = net * 0.05;
  else if (net <= 500000)  tax = 12500  + (net - 250000) * 0.20;
  else if (net <= 750000)  tax = 112500 + (net - 500000) * 0.20;
  else if (net <= 1000000) tax = 162500 + (net - 750000) * 0.20;
  else if (net <= 1250000) tax = 212500 + (net - 1000000) * 0.30;
  else if (net <= 1500000) tax = 287500 + (net - 1250000) * 0.30;
  else                     tax = 362500 + (net - 1500000) * 0.30;

  // Rebate u/s 87A: if income ≤ 5L, rebate up to ₹12,500
  if (taxableIncome <= 500000) tax = Math.max(0, tax - 12500);
  return Math.round(tax);
};

// ─── NEW REGIME TAX (FY 2024-25, Budget 2024) ─────────────────
const getNewRegimeBaseTax = (income) => {
  // Standard deduction ₹75,000 already applied before calling this
  let tax = 0;
  if (income <= 300000)       tax = 0;
  else if (income <= 700000)  tax = (income - 300000) * 0.05;
  else if (income <= 1000000) tax = 20000 + (income - 700000) * 0.10;
  else if (income <= 1200000) tax = 50000 + (income - 1000000) * 0.15;
  else if (income <= 1500000) tax = 80000 + (income - 1200000) * 0.20;
  else                        tax = 140000 + (income - 1500000) * 0.30;

  // Rebate u/s 87A: No tax if income ≤ ₹7L in new regime
  if (income <= 700000) tax = 0;
  return Math.round(tax);
};

// Add 4% Health & Education Cess
const addCess = (baseTax) => Math.round(baseTax * 1.04);

// ─── DEDUCTION CALCULATOR ─────────────────────────────────────
const calcDeductions = (d = {}) => {
  const s80C      = Math.min(d.section80C  || 0, 150000);
  const s80D      = Math.min(d.section80D  || 0, 50000);   // 50k for senior
  const s80G      = d.section80G    || 0;
  const hra       = d.hra           || 0;
  const homeLoan  = Math.min(d.homeLoanInterest || 0, 200000);
  const nps       = Math.min(d.nps  || 0, 50000);           // 80CCD(1B)
  const stdDed    = d.standardDeduction ?? 50000;            // default salaried
  const edu       = Math.min(d.educationLoan || 0, 100000); // 80E no limit but practical cap

  const total = s80C + s80D + s80G + hra + homeLoan + nps + stdDed + edu;
  return { section80C: s80C, section80D: s80D, section80G: s80G, hra,
           homeLoanInterest: homeLoan, nps, standardDeduction: stdDed,
           educationLoan: edu, total };
};

// ─── MAIN CALCULATION ─────────────────────────────────────────
const calculateTax = ({ grossIncome, age = 'below60', deductions = {} }) => {
  const income = Number(grossIncome) || 0;
  const ded    = calcDeductions(deductions);

  // --- Old Regime ---
  const oldTaxableIncome = Math.max(0, income - ded.total);
  const oldBaseTax       = getOldRegimeBaseTax(oldTaxableIncome, age);
  const oldTotalTax      = addCess(oldBaseTax);

  // --- New Regime (only ₹75,000 std deduction from Budget 2024) ---
  const newTaxableIncome = Math.max(0, income - 75000);
  const newBaseTax       = getNewRegimeBaseTax(newTaxableIncome);
  const newTotalTax      = addCess(newBaseTax);

  const savings           = oldTotalTax - newTotalTax;
  const recommendedRegime = savings > 0 ? 'new' : 'old';

  const fuzzy = fuzzyLogicAnalysis(income, ded.total, age);

  return {
    grossIncome : income,
    age,
    deductions  : ded,
    oldRegime   : {
      taxableIncome : oldTaxableIncome,
      baseTax       : oldBaseTax,
      cess          : oldTotalTax - oldBaseTax,
      totalTax      : oldTotalTax,
      effectiveRate : income > 0 ? +((oldTotalTax / income) * 100).toFixed(2) : 0,
      takeHome      : income - oldTotalTax
    },
    newRegime   : {
      taxableIncome : newTaxableIncome,
      baseTax       : newBaseTax,
      cess          : newTotalTax - newBaseTax,
      totalTax      : newTotalTax,
      effectiveRate : income > 0 ? +((newTotalTax / income) * 100).toFixed(2) : 0,
      takeHome      : income - newTotalTax
    },
    recommendation : {
      regime    : recommendedRegime,
      savings   : Math.abs(savings),
      message   : buildRecommendationMsg(recommendedRegime, Math.abs(savings), ded.total)
    },
    fuzzyAnalysis : fuzzy
  };
};

// ─── FUZZY LOGIC ENGINE ───────────────────────────────────────
/**
 * Membership functions:
 *   incomeLevel  → { low, medium, high }
 *   dedLevel     → { low, medium, high }  (as ratio of income)
 *   complexity   → { low, medium, high }
 *
 * Rules:
 *   R1: income.high  ∧ ded.low    → new regime, mild CA suggestion
 *   R2: income.med   ∧ ded.high   → old regime
 *   R3: income.high  ∧ ded.high   → old regime, strong CA suggestion
 *   R4: complexity.high            → strong CA suggestion
 *   R5: income.low                 → new regime (simpler)
 */
const fuzzyMF = {
  income: (x) => ({
    low    : x < 500000  ? 1 : x < 800000  ? (800000 - x)  / 300000 : 0,
    medium : x < 500000  ? 0 : x < 800000  ? (x - 500000)  / 300000
           : x < 1200000 ? (1200000 - x) / 400000 : 0,
    high   : x < 800000  ? 0 : x < 1200000 ? (x - 800000)  / 400000 : 1
  }),
  deduction: (d, income) => {
    const r = income > 0 ? d / income : 0;
    return {
      low    : r < 0.10 ? 1 : r < 0.20 ? (0.20 - r) / 0.10 : 0,
      medium : r < 0.10 ? 0 : r < 0.20 ? (r - 0.10) / 0.10
             : r < 0.30 ? (0.30 - r) / 0.10 : 0,
      high   : r < 0.20 ? 0 : r < 0.30 ? (r - 0.20) / 0.10 : 1
    };
  },
  complexity: (income, deductions, age) => {
    let s = 0;
    if (income > 1000000)  s += 0.3;
    if (income > 2000000)  s += 0.3;
    if (deductions > 200000) s += 0.2;
    if (age !== 'below60') s += 0.1;
    if (deductions > 0 && income > 500000) s += 0.1;
    return {
      low    : s < 0.3 ? 1 : s < 0.6 ? (0.6 - s) / 0.3 : 0,
      medium : s < 0.3 ? 0 : s < 0.6 ? (s - 0.3) / 0.3 : s < 0.9 ? (0.9 - s) / 0.3 : 0,
      high   : s < 0.6 ? 0 : s < 0.9 ? (s - 0.6) / 0.3 : 1
    };
  }
};

const fuzzyLogicAnalysis = (income, deductions, age) => {
  const inc  = fuzzyMF.income(income);
  const ded  = fuzzyMF.deduction(deductions, income);
  const comp = fuzzyMF.complexity(income, deductions, age);

  let newScore = 0, oldScore = 0, caScore = 0;

  // R1: High income + low deductions → new regime
  if (inc.high > 0.7 && ded.low > 0.6) {
    newScore += Math.min(inc.high, ded.low) * 0.8;
    caScore  += 0.3;
  }
  // R2: Medium income + high deductions → old regime
  if (inc.medium > 0.5 && ded.high > 0.6) {
    oldScore += Math.min(inc.medium, ded.high) * 0.9;
  }
  // R3: High income + high deductions → old regime + CA
  if (inc.high > 0.5 && ded.high > 0.5) {
    oldScore += Math.min(inc.high, ded.high) * 0.7;
    caScore  += 0.5;
  }
  // R4: High complexity → CA
  if (comp.high > 0.7) caScore += comp.high;
  // R5: Low income → new
  if (inc.low > 0.7) newScore += 0.5;

  const totalScore = newScore + oldScore || 1;
  const regimeSuggestion = newScore >= oldScore ? 'new' : 'old';
  const confidence = +(Math.min(Math.abs(newScore - oldScore) / totalScore, 1) * 100).toFixed(0);
  const suggestCA  = caScore > 0.5;

  return {
    incomeLevel: inc, deductionLevel: ded, complexity: comp,
    regimeSuggestion, confidence,
    suggestCA,
    caReason: suggestCA
      ? 'Your financial complexity suggests consulting a CA for optimal tax filing'
      : null
  };
};

// ─── DEDUCTION OPTIMIZER ──────────────────────────────────────
const optimizeDeductions = (income, currentDeductions = {}) => {
  const tips = [];
  const cd   = currentDeductions;

  const rem80C = Math.max(0, 150000 - (cd.section80C || 0));
  if (rem80C > 0) tips.push({
    section   : '80C',
    potential : rem80C,
    action    : `Invest ₹${rem80C.toLocaleString('en-IN')} more in ELSS/PPF/LIC to max 80C`,
    priority  : 'high',
    icon      : '💰'
  });

  if (!cd.nps || cd.nps < 50000) tips.push({
    section   : '80CCD(1B)',
    potential : 50000,
    action    : 'Open NPS & invest ₹50,000 for EXTRA deduction (over 80C limit)',
    priority  : 'high',
    icon      : '🏦'
  });

  const rem80D = Math.max(0, 25000 - (cd.section80D || 0));
  if (rem80D > 0) tips.push({
    section   : '80D',
    potential : rem80D,
    action    : `Buy health insurance to save ₹${rem80D.toLocaleString('en-IN')} via 80D`,
    priority  : 'medium',
    icon      : '🏥'
  });

  if (!cd.homeLoanInterest && income > 800000) tips.push({
    section   : '24b',
    potential : 200000,
    action    : 'Home loan interest up to ₹2L deductible under Section 24b',
    priority  : 'low',
    icon      : '🏠'
  });

  if (!cd.educationLoan) tips.push({
    section   : '80E',
    potential : 100000,
    action    : 'Education loan interest fully deductible under 80E (no limit)',
    priority  : 'low',
    icon      : '🎓'
  });

  return tips;
};

// ─── GOAL STRATEGIES ──────────────────────────────────────────
const getGoalStrategy = (goal, income, currentDeductions = {}) => {
  const strategies = {
    save_max_tax : {
      title       : 'Maximum Tax Saving Strategy',
      description : 'Claim every eligible deduction under the old regime to minimize tax outgo',
      icon        : '💰',
      regime      : 'old',
      steps       : [
        'Maximize 80C: Invest ₹1.5L in ELSS + PPF combination',
        'Add NPS ₹50K under 80CCD(1B) – extra deduction beyond 80C',
        'Buy family health insurance to claim 80D (₹25,000-₹50,000)',
        'If renting, calculate & claim HRA exemption',
        'Home loan? Claim ₹2L interest deduction under Section 24b',
        'Donate to PM CARES or registered NGOs for 80G deduction'
      ],
      estimatedSaving : Math.min(income * 0.15, 150000)
    },
    balanced_strategy : {
      title       : 'Balanced Tax + Investment Strategy',
      description : 'Balance tax savings with liquidity and diversified investment growth',
      icon        : '⚖️',
      regime      : income > 1500000 ? 'new' : 'old',
      steps       : [
        'Invest ₹1.5L in ELSS (tax saving + equity growth, 3-yr lock-in)',
        'Open NPS for ₹50K extra deduction + pension corpus',
        'Keep 6-month emergency fund in liquid mutual funds',
        'Term insurance for life cover + 80C benefit',
        'Health insurance for family + 80D deduction',
        'Review old vs new regime every April'
      ],
      estimatedSaving : Math.min(income * 0.10, 100000)
    },
    wealth_growth : {
      title       : 'Wealth Growth Strategy',
      description : 'Opt new regime, redirect surplus into high-return investments',
      icon        : '📈',
      regime      : 'new',
      steps       : [
        'Switch to New Regime – save time, keep more investable cash',
        'Invest full ₹2L+ (saved from deduction filing) in Nifty 50 index fund',
        'LTCG on equity up to ₹1.25L per year is TAX-FREE',
        'Maximize EPF/VPF for risk-free debt allocation',
        'Use Debt mutual funds for goals < 3 years',
        'Tax-loss harvest every March to offset capital gains'
      ],
      estimatedSaving : Math.min(income * 0.08, 80000)
    }
  };
  return strategies[goal] || strategies.balanced_strategy;
};

const buildRecommendationMsg = (regime, savings, deductions) =>
  regime === 'new'
    ? `New Regime saves ₹${savings.toLocaleString('en-IN')}. Your deductions (₹${deductions.toLocaleString('en-IN')}) aren't high enough to benefit from Old Regime.`
    : `Old Regime saves ₹${savings.toLocaleString('en-IN')}. Your deductions (₹${deductions.toLocaleString('en-IN')}) significantly reduce taxable income.`;

module.exports = { calculateTax, getGoalStrategy, optimizeDeductions, fuzzyLogicAnalysis, calcDeductions };
