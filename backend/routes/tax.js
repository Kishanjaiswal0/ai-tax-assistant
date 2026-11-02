
// routes/tax.js
// Tax Calculation, Simulation, Goal Planning and Optimization

const express = require('express');
const { auth } = require('../middleware/auth');

const {
  calculateTax,
  getGoalStrategy,
  optimizeDeductions
} = require('../utils/taxEngine');

const router = express.Router();

// ─── COMMON VALIDATION ────────────────────────────────────────

const isValidIncome = value =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;

const isValidDeductions = value =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

// ─── POST /api/tax/calculate ───────────────────────────────────

router.post('/calculate', auth, async (req, res) => {
  try {
    const {
      grossIncome,
      age = 'below60',
      deductions = {},
      taxYear = 'FY2024-25',
      residentialStatus = 'resident'
    } = req.body || {};

    if (!isValidIncome(grossIncome)) {
      return res.status(400).json({
        success: false,
        error: 'Valid non-negative grossIncome is required.'
      });
    }

    if (!isValidDeductions(deductions)) {
      return res.status(400).json({
        success: false,
        error: 'deductions must be a valid object.'
      });
    }

    const result = calculateTax({
      grossIncome: Number(grossIncome),
      age,
      deductions,
      taxYear,
      residentialStatus
    });

    const tips = optimizeDeductions(
      Number(grossIncome),
      deductions,
      taxYear,
      'old'
    );

    return res.json({
      success: true,
      ...result,
      optimizationTips: tips
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ─── POST /api/tax/simulate ────────────────────────────────────

router.post('/simulate', auth, async (req, res) => {
  try {
    const {
      scenarios = [],
      taxYear = 'FY2024-25',
      residentialStatus = 'resident'
    } = req.body || {};

    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'A non-empty scenarios array is required.'
      });
    }

    if (scenarios.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 scenarios are allowed.'
      });
    }

    const results = scenarios.map((scenario, index) => {
      if (!scenario || !isValidIncome(scenario.income)) {
        throw new Error(
          `Invalid income in scenario ${index + 1}.`
        );
      }

      const deductions = scenario.deductions || {};

      if (!isValidDeductions(deductions)) {
        throw new Error(
          `Invalid deductions in scenario ${index + 1}.`
        );
      }

      const result = calculateTax({
        grossIncome: Number(scenario.income),
        age: scenario.age || 'below60',
        deductions,
        taxYear: scenario.taxYear || taxYear,
        residentialStatus:
          scenario.residentialStatus || residentialStatus
      });

      return {
        label: scenario.label || `Scenario ${index + 1}`,
        ...result
      };
    });

    return res.json({
      success: true,
      results
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ─── POST /api/tax/goal-strategy ───────────────────────────────

router.post('/goal-strategy', auth, async (req, res) => {
  try {
    const {
      goal,
      income,
      currentDeductions = {},
      taxYear = 'FY2024-25',
      age = 'below60',
      residentialStatus = 'resident'
    } = req.body || {};

    if (!goal || !isValidIncome(income)) {
      return res.status(400).json({
        success: false,
        error: 'Valid goal and non-negative income are required.'
      });
    }

    if (!isValidDeductions(currentDeductions)) {
      return res.status(400).json({
        success: false,
        error: 'currentDeductions must be a valid object.'
      });
    }

    const strategy = getGoalStrategy(
      goal,
      Number(income),
      currentDeductions
    );

    const currentTax = calculateTax({
      grossIncome: Number(income),
      age,
      deductions: currentDeductions,
      taxYear,
      residentialStatus
    });

    return res.json({
      success: true,
      strategy,
      currentTax
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ─── POST /api/tax/optimize ────────────────────────────────────

router.post('/optimize', auth, async (req, res) => {
  try {
    const {
      income,
      deductions = {},
      taxYear = 'FY2024-25',
      regime = 'old'
    } = req.body || {};

    if (!isValidIncome(income)) {
      return res.status(400).json({
        success: false,
        error: 'Valid non-negative income is required.'
      });
    }

    if (!isValidDeductions(deductions)) {
      return res.status(400).json({
        success: false,
        error: 'deductions must be a valid object.'
      });
    }

    if (!['old', 'new'].includes(regime)) {
      return res.status(400).json({
        success: false,
        error: 'regime must be old or new.'
      });
    }

    const tips = optimizeDeductions(
      Number(income),
      deductions,
      taxYear,
      regime
    );

    return res.json({
      success: true,
      tips
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
