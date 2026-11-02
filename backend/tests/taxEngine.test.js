
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateTax,
  calculateSlabTax
} = require('../utils/taxEngine');

test('slab calculation applies progressive rates correctly', () => {
  const slabs = [
    { limit: 400000, rate: 0 },
    { limit: 800000, rate: 0.05 },
    { limit: Infinity, rate: 0.10 }
  ];

  assert.equal(calculateSlabTax(1000000, slabs), 40000);
});

test('FY2024-25 new regime rebate makes tax zero at ₹7 lakh', () => {
  const result = calculateTax({
    grossIncome: 700000,
    taxYear: 'FY2024-25'
  });

  assert.equal(result.newRegime.totalTax, 0);
});

test('FY2025-26 new regime rebate makes tax zero at ₹12 lakh', () => {
  const result = calculateTax({
    grossIncome: 1200000,
    taxYear: 'FY2025-26'
  });

  assert.equal(result.newRegime.totalTax, 0);
});

test('TY2026-27 new regime rebate makes tax zero at ₹12 lakh', () => {
  const result = calculateTax({
    grossIncome: 1200000,
    taxYear: 'TY2026-27'
  });

  assert.equal(result.newRegime.totalTax, 0);
});

test('old regime rebate applies to eligible resident individual', () => {
  const result = calculateTax({
    grossIncome: 500000,
    taxYear: 'FY2024-25',
    residentialStatus: 'resident'
  });

  assert.equal(result.oldRegime.totalTax, 0);
});

test('old regime rebate is not applied to non-resident', () => {
  const result = calculateTax({
    grossIncome: 500000,
    taxYear: 'FY2024-25',
    residentialStatus: 'non-resident'
  });

  assert.ok(result.oldRegime.totalTax > 0);
});

test('unsupported tax year is rejected', () => {
  assert.throws(
    () => calculateTax({
      grossIncome: 1000000,
      taxYear: 'FY2027-28'
    }),
    /Unsupported taxYear/
  );
});

test('negative gross income is rejected', () => {
  assert.throws(
    () => calculateTax({
      grossIncome: -1000
    }),
    /grossIncome/
  );
});
