// routes/tax.js - Tax Calculation, Simulation & Goal Planning
const express = require('express');
const { auth } = require('../middleware/auth');
const { calculateTax, getGoalStrategy, optimizeDeductions } = require('../utils/taxEngine');

const router = express.Router();

// ── POST /api/tax/calculate ───────────────────────────────────
router.post('/calculate', auth, async (req, res) => {
  try {
    const { grossIncome, age = 'below60', deductions = {} } = req.body;
    if (!grossIncome || isNaN(grossIncome) || Number(grossIncome) < 0)
      return res.status(400).json({ error: 'Valid grossIncome required.' });

    const result = calculateTax({ grossIncome: Number(grossIncome), age, deductions });
    const tips   = optimizeDeductions(Number(grossIncome), deductions);
    res.json({ success: true, ...result, optimizationTips: tips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/simulate ────────────────────────────────────
// What-if: pass array of scenarios, get results for each
router.post('/simulate', auth, async (req, res) => {
  try {
    const { scenarios = [] } = req.body;
    if (!Array.isArray(scenarios) || scenarios.length === 0)
      return res.status(400).json({ error: 'scenarios array required.' });

    const results = scenarios.map(s => ({
      label : s.label || 'Scenario',
      ...calculateTax({ grossIncome: s.income, age: s.age || 'below60', deductions: s.deductions || {} })
    }));
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/goal-strategy ───────────────────────────────
router.post('/goal-strategy', auth, async (req, res) => {
  try {
    const { goal, income, currentDeductions = {} } = req.body;
    if (!goal || !income) return res.status(400).json({ error: 'goal and income required.' });

    const strategy = getGoalStrategy(goal, Number(income), currentDeductions);
    const current  = calculateTax({ grossIncome: Number(income), deductions: currentDeductions });
    res.json({ success: true, strategy, currentTax: current });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/optimize ────────────────────────────────────
router.post('/optimize', auth, async (req, res) => {
  try {
    const { income, deductions = {} } = req.body;
    const tips = optimizeDeductions(Number(income), deductions);
    res.json({ success: true, tips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
