// backend/utils/taxEngine.js
// Indian individual income-tax estimator for supported periods.
// IMPORTANT: This is an estimator for ordinary slab-rate income, not a complete ITR engine.
// Special-rate income (capital gains, lottery, crypto/VDA, dividend, NRIs/DTAA, etc.),
// losses, AMT, marginal relief on special-rate income and detailed property computations
// must be calculated separately before using this for a filing/payment decision.

const TAX_RULES = {
  'FY2024-25': {
    act: 'Income-tax Act, 1961',
    oldRegime: {
      below60: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ],
      '60to80': [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ],
      above80: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ]
    },
    newRegime: [
      { limit: 300000, rate: 0 },
      { limit: 700000, rate: 0.05 },
      { limit: 1000000, rate: 0.10 },
      { limit: 1200000, rate: 0.15 },
      { limit: 1500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    rebate: {
      old: { limit: 500000, max: 12500 },
      new: { limit: 700000, max: 25000 }
    },
    standardDeduction: {
      old: 50000,
      new: 75000
    }
  },

  'FY2025-26': {
    act: 'Income-tax Act, 1961',
    oldRegime: {
      below60: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ],
      '60to80': [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ],
      above80: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ]
    },
    newRegime: [
      { limit: 400000, rate: 0 },
      { limit: 800000, rate: 0.05 },
      { limit: 1200000, rate: 0.10 },
      { limit: 1600000, rate: 0.15 },
      { limit: 2000000, rate: 0.20 },
      { limit: 2400000, rate: 0.25 },
      { limit: Infinity, rate: 0.30 }
    ],
    rebate: {
      old: { limit: 500000, max: 12500 },
      new: { limit: 1200000, max: 60000 }
    },
    standardDeduction: {
      old: 50000,
      new: 75000
    }
  },

  'TY2026-27': {
    act: 'Income-tax Act, 2025',
    oldRegime: {
      below60: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ],
      '60to80': [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ],
      above80: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
      ]
    },
    newRegime: [
      { limit: 400000, rate: 0 },
      { limit: 800000, rate: 0.05 },
      { limit: 1200000, rate: 0.10 },
      { limit: 1600000, rate: 0.15 },
      { limit: 2000000, rate: 0.20 },
      { limit: 2400000, rate: 0.25 },
      { limit: Infinity, rate: 0.30 }
    ],
    rebate: {
      old: { limit: 500000, max: 12500 },
      new: { limit: 1200000, max: 60000 }
    },
    standardDeduction: {
      old: 50000,
      new: 75000
    }
  }
};

const SUPPORTED_TAX_YEARS = Object.keys(TAX_RULES);

const roundRupee = value => Math.round(Number(value) || 0);

const nonNegative = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const isResident = status =>
  String(status || 'resident').toLowerCase() === 'resident';

const validateTaxYear = taxYear => {
  if (!TAX_RULES[taxYear]) {
    throw new Error(
      `Unsupported taxYear. Use one of: ${SUPPORTED_TAX_YEARS.join(', ')}`
    );
  }

  return TAX_RULES[taxYear];
};

// ─── PROGRESSIVE SLAB TAX ──────────────────────────────────────
const calculateSlabTax = (taxableIncome, slabs) => {
  const income = nonNegative(taxableIncome);

  let tax = 0;
  let lower = 0;

  for (const slab of slabs) {
    const upper = slab.limit;

    const amountInSlab = Math.max(
      0,
      Math.min(income, upper) - lower
    );

    tax += amountInSlab * slab.rate;
    lower = upper;

    if (income <= upper) break;
  }

  return roundRupee(tax);
};

// ─── AGE CATEGORY ──────────────────────────────────────────────
const getAgeKey = age => {
  if (age === 'above80') return 'above80';
  if (age === '60to80') return '60to80';
  return 'below60';
};

// ─── OLD REGIME BASE TAX ───────────────────────────────────────
const getOldRegimeBaseTax = (
  taxableIncome,
  age,
  taxYear = 'FY2024-25',
  residentialStatus = 'resident'
) => {
  const rules = validateTaxYear(taxYear);

  // Age-based old-regime slabs apply according to age.
  // The AY 2026-27 official guidance lists these slabs for
  // resident and non-resident individuals.
  const ageKey = getAgeKey(age);

  let tax = calculateSlabTax(
    taxableIncome,
    rules.oldRegime[ageKey]
  );

  // Rebate is available only to eligible resident individuals.
  const rebate = rules.rebate.old;

  if (
    isResident(residentialStatus) &&
    taxableIncome <= rebate.limit
  ) {
    tax = Math.max(0, tax - rebate.max);
  }

  return roundRupee(tax);
};

// ─── NEW REGIME BASE TAX ───────────────────────────────────────
const getNewRegimeBaseTax = (
  taxableIncome,
  taxYear = 'FY2024-25',
  residentialStatus = 'resident'
) => {
  const rules = validateTaxYear(taxYear);

  let tax = calculateSlabTax(
    taxableIncome,
    rules.newRegime
  );

  const rebate = rules.rebate.new;

  if (isResident(residentialStatus)) {
    if (taxableIncome <= rebate.limit) {
      tax = Math.max(0, tax - rebate.max);
    } else {
      // Marginal relief just above the rebate threshold:
      // tax payable cannot exceed income above that threshold.
      // The full rebate itself is not available once income
      // exceeds the eligibility threshold.
      tax = Math.min(
        tax,
        taxableIncome - rebate.limit
      );
    }
  }

  return roundRupee(tax);
};

// ─── SURCHARGE RATE ────────────────────────────────────────────
const getSurchargeRate = (
  taxableIncome,
  regime = 'old'
) => {
  if (taxableIncome <= 5000000) return 0;
  if (taxableIncome <= 10000000) return 0.10;
  if (taxableIncome <= 20000000) return 0.15;
  if (taxableIncome <= 50000000) return 0.25;

  return regime === 'old' ? 0.37 : 0.25;
};

// ─── SURCHARGE THRESHOLD ───────────────────────────────────────
const getSurchargeThreshold = (
  taxableIncome,
  regime
) => {
  const thresholds = regime === 'old'
    ? [5000000, 10000000, 20000000, 50000000]
    : [5000000, 10000000, 20000000];

  return thresholds
    .filter(limit => taxableIncome > limit)
    .pop() || null;
};

// ─── SURCHARGE WITH MARGINAL RELIEF ────────────────────────────
const applySurcharge = (
  baseTax,
  taxableIncome,
  regime = 'old',
  taxAtThreshold = 0
) => {
  const rate = getSurchargeRate(
    taxableIncome,
    regime
  );

  const ordinarySurcharge = roundRupee(
    baseTax * rate
  );

  const threshold = getSurchargeThreshold(
    taxableIncome,
    regime
  );

  let surcharge = ordinarySurcharge;

  if (threshold !== null) {
    const thresholdRate = getSurchargeRate(
      threshold,
      regime
    );

    const taxPlusSurchargeAtThreshold =
      taxAtThreshold +
      roundRupee(taxAtThreshold * thresholdRate);

    const permittedTaxPlusSurcharge =
      taxPlusSurchargeAtThreshold +
      (taxableIncome - threshold);

    const permittedSurcharge = Math.max(
      0,
      permittedTaxPlusSurcharge - baseTax
    );

    surcharge = Math.min(
      ordinarySurcharge,
      roundRupee(permittedSurcharge)
    );
  }

  const taxAfterSurcharge = baseTax + surcharge;
  const cess = roundRupee(taxAfterSurcharge * 0.04);
  const totalTax = taxAfterSurcharge + cess;

  return {
    surcharge,
    taxAfterSurcharge,
    cess,
    totalTax,
    surchargeRate: rate,
    marginalReliefApplied:
      surcharge < ordinarySurcharge
  };
};

// ─── DEDUCTION CALCULATOR ──────────────────────────────────────
// Important: HRA, home-loan and 80G values must be supplied as
// already-calculated eligible deduction amounts.
// This function does not determine eligibility from documents.
const calcDeductions = (
  d = {},
  regime = 'old',
  taxYear = 'FY2024-25'
) => {
  const rules = validateTaxYear(taxYear);
  const isOld = regime === 'old';

  const eligibleSalary =
    d.isSalariedOrPensioner === true;

  const salaryAmount =
    nonNegative(d.salaryOrPensionIncome);

  // Section 80C
  const s80C = isOld
    ? Math.min(
        nonNegative(d.section80C),
        150000
      )
    : 0;

  // Section 80D
  const selfLimit = d.selfFamilySeniorCitizen === true
    ? 50000
    : 25000;

  const parentsLimit = d.parentsSeniorCitizen === true
    ? 50000
    : 25000;

  const self80DInput =
    d.section80DSelfFamily !== undefined
      ? d.section80DSelfFamily
      : d.section80D;

  const selfFamily80D = isOld
    ? Math.min(
        nonNegative(self80DInput),
        selfLimit
      )
    : 0;

  const parents80D = isOld
    ? Math.min(
        nonNegative(d.section80DParents),
        parentsLimit
      )
    : 0;

  const s80D = selfFamily80D + parents80D;

  // Section 80G: already-calculated eligible amount.
  const s80G = isOld
    ? nonNegative(d.section80GEligible)
    : 0;

  // HRA: already-calculated eligible exemption.
  const hra = isOld
    ? nonNegative(d.hraExemption)
    : 0;

  // Home-loan interest: caller supplies the eligible deduction
  // after property-specific limits and loss-set-off rules.
  const homeLoanInput =
    d.homeLoanInterestDeduction !== undefined
      ? d.homeLoanInterestDeduction
      : d.homeLoanInterest;

  const homeLoan = isOld
    ? nonNegative(homeLoanInput)
    : 0;

  // Section 80CCD(1B)
  const nps80CCD1B = isOld
    ? Math.min(
        nonNegative(d.nps80CCD1B || d.nps),
        50000
      )
    : 0;

  // Employer NPS contribution under Section 80CCD(2).
  // Old regime: generally 10% for other employers and 14%
  // for Central/State Government employers.
  // New regime: 14% of eligible salary.
  const employerNpsRate = isOld
    ? (
        d.employerType === 'central' ||
        d.employerType === 'state'
          ? 0.14
          : 0.10
      )
    : 0.14;

  const employerNpsCap =
    nonNegative(d.salaryForNps) *
    employerNpsRate;

  const employerNps = Math.min(
    nonNegative(d.employerNpsContribution),
    employerNpsCap
  );

  // Section 80E: interest only, no fixed rupee ceiling.
  // Caller must supply eligible interest for the qualifying period.
  const educationLoanInput =
    d.educationLoanInterest !== undefined
      ? d.educationLoanInterest
      : d.educationLoan;

  const edu = isOld
    ? nonNegative(educationLoanInput)
    : 0;

  // Standard deduction for eligible salary/pension income.
  const standardDeduction = eligibleSalary
    ? Math.min(
        salaryAmount ||
          nonNegative(d.standardDeduction),
        d.standardDeduction !== undefined
          ? nonNegative(d.standardDeduction)
          : rules.standardDeduction[regime]
      )
    : 0;

  const chapterVIA = isOld
    ? (
        s80C +
        s80D +
        s80G +
        nps80CCD1B +
        edu
      )
    : 0;

  const total =
    chapterVIA +
    hra +
    homeLoan +
    employerNps +
    standardDeduction;

  return {
    section80C: s80C,
    section80DSelfFamily: selfFamily80D,
    section80DParents: parents80D,
    section80D: s80D,
    section80G: s80G,
    hraExemption: hra,
    hra,
    homeLoanInterest: homeLoan,
    nps: nps80CCD1B,
    nps80CCD1B,
    employerNpsContribution: employerNps,
    educationLoan: edu,
    standardDeduction,
    total
  };
};

// ─── MAIN TAX CALCULATION ──────────────────────────────────────
const calculateTax = ({
  grossIncome,
  age = 'below60',
  deductions = {},
  taxYear = 'FY2024-25',
  residentialStatus = 'resident'
} = {}) => {
  const rules = validateTaxYear(taxYear);

  const income = Number(grossIncome);

  if (!Number.isFinite(income) || income < 0) {
    throw new Error(
      'grossIncome must be a valid non-negative number.'
    );
  }

  const status = String(
    residentialStatus
  ).toLowerCase();

  if (
    ![
      'resident',
      'non-resident',
      'not-ordinarily-resident'
    ].includes(status)
  ) {
    throw new Error(
      'residentialStatus must be resident, non-resident, or not-ordinarily-resident.'
    );
  }

  // Calculate deductions separately for each regime.
  const oldDed = calcDeductions(
    deductions,
    'old',
    taxYear
  );

  const newDed = calcDeductions(
    deductions,
    'new',
    taxYear
  );

  // OLD REGIME
  const oldTaxableIncome = Math.max(
    0,
    income - oldDed.total
  );

  const oldAgeKey = getAgeKey(age);

  const oldBaseTax = getOldRegimeBaseTax(
    oldTaxableIncome,
    oldAgeKey,
    taxYear,
    status
  );

  const oldThreshold = getSurchargeThreshold(
    oldTaxableIncome,
    'old'
  );

  const oldTaxAtThreshold =
    oldThreshold === null
      ? 0
      : getOldRegimeBaseTax(
          oldThreshold,
          oldAgeKey,
          taxYear,
          status
        );

  const oldSurchargeResult = applySurcharge(
    oldBaseTax,
    oldTaxableIncome,
    'old',
    oldTaxAtThreshold
  );

  // NEW REGIME
  const newTaxableIncome = Math.max(
    0,
    income - newDed.total
  );

  const newBaseTax = getNewRegimeBaseTax(
    newTaxableIncome,
    taxYear,
    status
  );

  const newThreshold = getSurchargeThreshold(
    newTaxableIncome,
    'new'
  );

  const newTaxAtThreshold =
    newThreshold === null
      ? 0
      : getNewRegimeBaseTax(
          newThreshold,
          taxYear,
          status
        );

  const newSurchargeResult = applySurcharge(
    newBaseTax,
    newTaxableIncome,
    'new',
    newTaxAtThreshold
  );

  // REGIME COMPARISON
  const oldTotalTax = oldSurchargeResult.totalTax;
  const newTotalTax = newSurchargeResult.totalTax;

  const savings = oldTotalTax - newTotalTax;

  const recommendedRegime =
    savings > 0 ? 'new' : 'old';

  const fuzzy = fuzzyLogicAnalysis(
    income,
    oldDed.total,
    age
  );

  return {
    grossIncome: income,
    age,
    residentialStatus: status,
    taxYear,
    act: rules.act,

    deductions: oldDed,

    oldRegime: {
      taxableIncome: oldTaxableIncome,
      deductions: oldDed,
      baseTax: oldBaseTax,
      surcharge: oldSurchargeResult.surcharge,
      surchargeRate: oldSurchargeResult.surchargeRate,
      taxAfterSurcharge:
        oldSurchargeResult.taxAfterSurcharge,
      cess: oldSurchargeResult.cess,
      totalTax: oldTotalTax,
      effectiveRate: income > 0
        ? +(
            (oldTotalTax / income) * 100
          ).toFixed(2)
        : 0,
      takeHome: income - oldTotalTax,
      marginalReliefApplied:
        oldSurchargeResult.marginalReliefApplied
    },

    newRegime: {
      taxableIncome: newTaxableIncome,
      deductions: newDed,
      baseTax: newBaseTax,
      surcharge: newSurchargeResult.surcharge,
      surchargeRate: newSurchargeResult.surchargeRate,
      taxAfterSurcharge:
        newSurchargeResult.taxAfterSurcharge,
      cess: newSurchargeResult.cess,
      totalTax: newTotalTax,
      effectiveRate: income > 0
        ? +(
            (newTotalTax / income) * 100
          ).toFixed(2)
        : 0,
      takeHome: income - newTotalTax,
      marginalReliefApplied:
        newSurchargeResult.marginalReliefApplied
    },

    recommendation: {
      regime: recommendedRegime,
      savings: Math.abs(savings),
      message: buildRecommendationMsg(
        recommendedRegime,
        Math.abs(savings),
        oldDed.total
      )
    },

    fuzzyAnalysis: fuzzy
  };
};

// ─── FUZZY LOGIC ENGINE ────────────────────────────────────────
const fuzzyMF = {
  income: x => ({
    low: x < 500000
      ? 1
      : x < 800000
        ? (800000 - x) / 300000
        : 0,

    medium: x < 500000
      ? 0
      : x < 800000
        ? (x - 500000) / 300000
        : x < 1200000
          ? (1200000 - x) / 400000
          : 0,

    high: x < 800000
      ? 0
      : x < 1200000
        ? (x - 800000) / 400000
        : 1
  }),

  deduction: (d, income) => {
    const ratio = income > 0 ? d / income : 0;

    return {
      low: ratio < 0.10
        ? 1
        : ratio < 0.20
          ? (0.20 - ratio) / 0.10
          : 0,

      medium: ratio < 0.10
        ? 0
        : ratio < 0.20
          ? (ratio - 0.10) / 0.10
          : ratio < 0.30
            ? (0.30 - ratio) / 0.10
            : 0,

      high: ratio < 0.20
        ? 0
        : ratio < 0.30
          ? (ratio - 0.20) / 0.10
          : 1
    };
  },

  complexity: (income, deductions, age) => {
    let score = 0;

    if (income > 1000000) score += 0.3;
    if (income > 2000000) score += 0.3;
    if (deductions > 200000) score += 0.2;
    if (age !== 'below60') score += 0.1;
    if (deductions > 0 && income > 500000) score += 0.1;

    return {
      low: score < 0.3
        ? 1
        : score < 0.6
          ? (0.6 - score) / 0.3
          : 0,

      medium: score < 0.3
        ? 0
        : score < 0.6
          ? (score - 0.3) / 0.3
          : score < 0.9
            ? (0.9 - score) / 0.3
            : 0,

      high: score < 0.6
        ? 0
        : score < 0.9
          ? (score - 0.6) / 0.3
          : 1
    };
  }
};

const fuzzyLogicAnalysis = (
  income,
  deductions,
  age
) => {
  const inc = fuzzyMF.income(income);
  const ded = fuzzyMF.deduction(
    deductions,
    income
  );
  const comp = fuzzyMF.complexity(
    income,
    deductions,
    age
  );

  let newScore = 0;
  let oldScore = 0;
  let caScore = 0;

  // R1: High income + low deductions -> new regime.
  if (inc.high > 0.7 && ded.low > 0.6) {
    newScore += Math.min(
      inc.high,
      ded.low
    ) * 0.8;

    caScore += 0.3;
  }

  // R2: Medium income + high deductions -> old regime.
  if (inc.medium > 0.5 && ded.high > 0.6) {
    oldScore += Math.min(
      inc.medium,
      ded.high
    ) * 0.9;
  }

  // R3: High income + high deductions -> old regime + CA.
  if (inc.high > 0.5 && ded.high > 0.5) {
    oldScore += Math.min(
      inc.high,
      ded.high
    ) * 0.7;

    caScore += 0.5;
  }

  // R4: High complexity -> CA.
  if (comp.high > 0.7) {
    caScore += comp.high;
  }

  // R5: Low income -> new regime.
  if (inc.low > 0.7) {
    newScore += 0.5;
  }

  const totalScore = newScore + oldScore || 1;
  const suggestCA = caScore > 0.5;

  return {
    incomeLevel: inc,
    deductionLevel: ded,
    complexity: comp,
    regimeSuggestion:
      newScore >= oldScore ? 'new' : 'old',
    confidence: +(
      Math.min(
        Math.abs(newScore - oldScore) / totalScore,
        1
      ) * 100
    ).toFixed(0),
    suggestCA,
    caReason: suggestCA
      ? 'Your financial complexity suggests consulting a CA for optimal tax filing'
      : null
  };
};

// ─── DEDUCTION OPTIMIZER ───────────────────────────────────────
const optimizeDeductions = (
  income,
  currentDeductions = {},
  taxYear = 'FY2024-25',
  regime = 'old'
) => {
  validateTaxYear(taxYear);

  const tips = [];

  if (regime !== 'old') return tips;

  const remaining80C = Math.max(
    0,
    150000 - nonNegative(currentDeductions.section80C)
  );

  if (remaining80C > 0) {
    tips.push({
      section: '80C',
      potential: remaining80C,
      action:
        `Check eligible 80C investments/payments; remaining indicative limit ₹${remaining80C.toLocaleString('en-IN')}.`,
      priority: 'high',
      icon: '💰'
    });
  }

  const current80D =
    nonNegative(
      currentDeductions.section80DSelfFamily ||
      currentDeductions.section80D
    ) +
    nonNegative(currentDeductions.section80DParents);

  if (current80D < 25000) {
    tips.push({
      section: '80D',
      potential: 25000 - current80D,
      action:
        'Check eligible health-insurance premium and preventive check-up payments under Section 80D.',
      priority: 'medium',
      icon: '🏥'
    });
  }

  if (!currentDeductions.employerNpsContribution) {
    tips.push({
      section: '80CCD(2)',
      potential: 0,
      action:
        'Check whether your employer contributes to an eligible NPS account; limits depend on salary and employer category.',
      priority: 'medium',
      icon: '🏦'
    });
  }

  return tips;
};

// ─── GOAL STRATEGIES ───────────────────────────────────────────
const getGoalStrategy = (
  goal,
  income,
  currentDeductions = {}
) => {
  const strategies = {
    save_max_tax: {
      title: 'Maximum Tax Saving Strategy',
      description:
        'Review eligible old-regime deductions before comparing final tax under both regimes.',
      icon: '💰',
      regime: 'old',
      steps: [
        'Check eligible Section 80C payments/investments within the aggregate limit.',
        'Check eligible health-insurance payments under Section 80D.',
        'Check NPS contributions under the applicable provisions.',
        'Calculate HRA exemption from salary, rent and city details where eligible.',
        'Verify home-loan interest and education-loan interest eligibility.',
        'Compare final old- and new-regime tax before choosing.'
      ],
      estimatedSaving: null
    },

    balanced_strategy: {
      title: 'Balanced Tax + Investment Strategy',
      description:
        'Compare tax outcomes while considering liquidity, risk and investment goals.',
      icon: '⚖️',
      regime: 'compare',
      steps: [
        'Compare both regimes using verified eligible deductions.',
        'Maintain an emergency fund appropriate to your expenses.',
        'Choose investments based on risk tolerance and time horizon, not tax savings alone.',
        'Review employer NPS contributions and eligible insurance cover.',
        'Recheck tax rules at the start of each tax year.'
      ],
      estimatedSaving: null
    },

    wealth_growth: {
      title: 'Wealth Growth Strategy',
      description:
        'Compare tax outcomes and invest surplus according to goals and risk tolerance.',
      icon: '📈',
      regime: 'new',
      steps: [
        'Calculate the new-regime tax using the applicable tax year.',
        'Compare the tax saved against the old regime after eligible deductions.',
        'Invest surplus according to your time horizon and risk profile.',
        'Review asset allocation and liquidity needs periodically.'
      ],
      estimatedSaving: null
    }
  };

  return strategies[goal] || strategies.balanced_strategy;
};

// ─── RECOMMENDATION MESSAGE ────────────────────────────────────
const buildRecommendationMsg = (
  regime,
  savings,
  deductions
) => regime === 'new'
  ? `New Regime saves ₹${savings.toLocaleString('en-IN')} based on the inputs supplied. Old-regime deductions entered: ₹${deductions.toLocaleString('en-IN')}.`
  : `Old Regime saves ₹${savings.toLocaleString('en-IN')} based on the inputs supplied. Old-regime deductions entered: ₹${deductions.toLocaleString('en-IN')}.`;

// ─── EXPORTS ───────────────────────────────────────────────────
module.exports = {
  TAX_RULES,
  calculateSlabTax,
  getOldRegimeBaseTax,
  getNewRegimeBaseTax,
  getSurchargeRate,
  applySurcharge,
  calculateTax,
  getGoalStrategy,
  optimizeDeductions,
  fuzzyLogicAnalysis,
  calcDeductions
};
