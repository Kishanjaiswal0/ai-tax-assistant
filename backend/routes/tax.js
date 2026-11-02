
// routes/tax.js
// Tax Calculation, Simulation, Goal Planning and Optimization
// Includes persistent tax calculation history.

const express = require('express');
const { auth } = require('../middleware/auth');
const TaxHistory = require('../models/TaxHistory');

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

    // Run the existing tax calculation engine.
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

    const oldTax = result.oldRegime.totalTax;
    const newTax = result.newRegime.totalTax;

    const recommendedRegime =
      oldTax === newTax
        ? 'equal'
        : oldTax < newTax
          ? 'old'
          : 'new';

    // Save history without interrupting the calculation
    // if MongoDB is temporarily unavailable.
    let historyId = null;
    let historySaved = false;

    try {
      const savedRecord = await TaxHistory.create({
        userId: req.userId,
        taxYear,
        grossIncome: Number(grossIncome),
        age,
        residentialStatus,
        deductions,
        oldRegime: result.oldRegime,
        newRegime: result.newRegime,
        recommendedRegime
      });

      historyId = savedRecord._id;
      historySaved = true;

    } catch (dbErr) {
      console.error(
        '[TAX/HISTORY SAVE]',
        dbErr.message
      );
    }

    return res.json({
      success: true,
      ...result,
      recommendedRegime,
      optimizationTips: tips,
      historyId,
      historySaved
    });

  } catch (err) {
    console.error('[TAX/CALCULATE]', err.message);

    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ─── GET /api/tax/history ──────────────────────────────────────

router.get('/history', auth, async (req, res) => {
  try {
    const history = await TaxHistory.find({
      userId: req.userId
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-__v');

    return res.json({
      success: true,
      count: history.length,
      history
    });

  } catch (err) {
    console.error('[TAX/HISTORY]', err.message);

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve tax history.'
    });
  }
});

// ─── GET /api/tax/history/:id ──────────────────────────────────

router.get('/history/:id', auth, async (req, res) => {
  try {
    const record = await TaxHistory.findOne({
      _id: req.params.id,
      userId: req.userId
    }).select('-__v');

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Tax calculation record not found.'
      });
    }

    return res.json({
      success: true,
      record
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid record ID.'
    });
  }
});

// ─── DELETE /api/tax/history/:id ───────────────────────────────

router.delete('/history/:id', auth, async (req, res) => {
  try {
    const record = await TaxHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Tax calculation record not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Tax history record deleted.'
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid record ID.'
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

      const scenarioDeductions = scenario.deductions || {};

      if (!isValidDeductions(scenarioDeductions)) {
        throw new Error(
          `Invalid deductions in scenario ${index + 1}.`
        );
      }

      const result = calculateTax({
        grossIncome: Number(scenario.income),
        age: scenario.age || 'below60',
        deductions: scenarioDeductions,
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
