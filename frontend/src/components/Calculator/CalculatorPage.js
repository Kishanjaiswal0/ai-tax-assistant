
import React, { useState } from 'react';
import { taxAPI } from '../../utils/api';
import { fmt } from '../../utils/taxEngine';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';

const INIT_DED = {
  isSalariedOrPensioner: false,
  salaryOrPensionIncome: 0,
  section80C: 0,
  section80DSelfFamily: 0,
  section80DParents: 0,
  selfFamilySeniorCitizen: false,
  parentsSeniorCitizen: false,
  section80GEligible: 0,
  hraExemption: 0,
  homeLoanInterestDeduction: 0,
  nps80CCD1B: 0,
  employerNpsContribution: 0,
  salaryForNps: 0,
  employerType: 'other',
  educationLoanInterest: 0
};

const TAX_YEARS = [
  { value: 'FY2024-25', label: 'FY 2024–25 (AY 2025–26)' },
  { value: 'FY2025-26', label: 'FY 2025–26 (AY 2026–27)' },
  { value: 'TY2026-27', label: 'Tax Year 2026–27' }
];

export default function CalculatorPage() {
  const [income, setIncome] = useState(1200000);
  const [age, setAge] = useState('below60');
  const [taxYear, setTaxYear] = useState('FY2024-25');
  const [residentialStatus, setResidentialStatus] = useState('resident');

  const [ded, setDed] = useState(INIT_DED);
  const [result, setResult] = useState(null);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState('inputs');

  const setD = key => event => {
    const value = Math.max(0, Number(event.target.value) || 0);
    setDed(previous => ({ ...previous, [key]: value }));
  };

  const setFlag = key => event => {
    setDed(previous => ({ ...previous, [key]: event.target.checked }));
  };

  const calculate = async () => {
    if (!Number.isFinite(income) || income < 0) {
      toast.error('Enter a valid income amount.');
      return;
    }

    if (
      ded.isSalariedOrPensioner &&
      ded.salaryOrPensionIncome > income
    ) {
      toast.error('Salary/pension income cannot exceed gross income.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await taxAPI.calculate({
        grossIncome: income,
        age,
        taxYear,
        residentialStatus,
        deductions: ded
      });

      if (
        !data.success ||
        !data.oldRegime ||
        !data.newRegime ||
        !data.recommendation
      ) {
        throw new Error(data.error || 'Invalid calculation response.');
      }

      setResult(data);
      setTips(data.optimizationTips || []);
      setActive('results');

      toast.success('Tax calculated successfully.');
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
        error.message ||
        'Tax calculation failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const chartData = result ? [
    {
      name: 'Old Regime',
      tax: result.oldRegime.totalTax,
      fill: '#6366f1'
    },
    {
      name: 'New Regime',
      tax: result.newRegime.totalTax,
      fill: '#38bdf8'
    }
  ] : [];

  const renderRegimeBreakdown = data => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '9px',
      fontSize: '13px'
    }}>
      {[
        ['Taxable Income', data.taxableIncome],
        ['Base Tax', data.baseTax],
        ['Surcharge', data.surcharge],
        ['Health & Education Cess', data.cess],
        ['Total Tax', data.totalTax]
      ].map(([label, value]) => (
        <div key={label} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <strong>{fmt(value || 0)}</strong>
        </div>
      ))}

      {data.marginalReliefApplied && (
        <span className="badge badge-blue">
          Marginal relief applied
        </span>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border)',
        paddingTop: '9px'
      }}>
        <span>Effective Rate</span>
        <strong>{data.effectiveRate}%</strong>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Take-home</span>
        <strong style={{ color: 'var(--success)' }}>
          {fmt(data.takeHome)}
        </strong>
      </div>
    </div>
  );

  const numberField = (key, label, help = '') => (
    <div className="form-group" key={key}>
      <label className="form-label">
        {label}
        {help && (
          <span style={{
            color: 'var(--text-muted)',
            fontWeight: 400,
            marginLeft: '5px'
          }}>
            {help}
          </span>
        )}
      </label>
      <input
        className="form-input"
        type="number"
        min="0"
        value={ded[key]}
        onChange={setD(key)}
      />
    </div>
  );

  const checkboxField = (key, label) => (
    <label key={key} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '9px',
      fontSize: '13px',
      marginBottom: '13px',
      cursor: 'pointer'
    }}>
      <input
        type="checkbox"
        checked={ded[key]}
        onChange={setFlag(key)}
      />
      {label}
    </label>
  );

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📊 Tax Calculator</div>
          <div className="page-sub">
            Multi-year Old vs New Regime Comparison
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['inputs', 'results'].map(tab => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`btn btn-sm ${
                active === tab ? 'btn-accent' : 'btn-ghost'
              }`}
            >
              {tab === 'inputs' ? '⚙️ Inputs' : '📊 Results'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">

        {/* INPUTS */}
        {active === 'inputs' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: '20px'
          }}>

            {/* Income Details */}
            <div className="card">
              <h3 style={{
                marginBottom: '16px',
                fontSize: '15px',
                fontFamily: 'Outfit,sans-serif'
              }}>
                💼 Income Details
              </h3>

              <div className="form-group">
                <label className="form-label">
                  Annual Gross Income (₹)
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={income}
                  onChange={e => setIncome(
                    Math.max(0, Number(e.target.value) || 0)
                  )}
                />
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '4px'
                }}>
                  {income >= 100000
                    ? `₹${(income / 100000).toFixed(1)} Lakh`
                    : fmt(income)}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tax Period</label>
                <select
                  className="form-select"
                  value={taxYear}
                  onChange={e => {
                    setTaxYear(e.target.value);
                    setResult(null);
                  }}
                >
                  {TAX_YEARS.map(year => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Age Group</label>
                <select
                  className="form-select"
                  value={age}
                  onChange={e => {
                    setAge(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="below60">Below 60 years</option>
                  <option value="60to80">60–80 years (Senior)</option>
                  <option value="above80">Above 80 years (Super Senior)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Residential Status</label>
                <select
                  className="form-select"
                  value={residentialStatus}
                  onChange={e => {
                    setResidentialStatus(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="resident">Resident</option>
                  <option value="non-resident">Non-resident</option>
                  <option value="not-ordinarily-resident">
                    Resident but Not Ordinarily Resident
                  </option>
                </select>
              </div>

              {checkboxField(
                'isSalariedOrPensioner',
                'I have eligible salary or pension income'
              )}

              {ded.isSalariedOrPensioner && (
                numberField(
                  'salaryOrPensionIncome',
                  'Salary/Pension Income (₹)',
                  'Included in gross income'
                )
              )}
            </div>

            {/* Investment and Insurance */}
            <div className="card">
              <h3 style={{
                marginBottom: '16px',
                fontSize: '15px',
                fontFamily: 'Outfit,sans-serif'
              }}>
                💰 Investment & Insurance
              </h3>

              {numberField(
                'section80C',
                'Section 80C',
                'Maximum ₹1.5 lakh'
              )}

              {numberField(
                'section80DSelfFamily',
                '80D: Self, Spouse & Children'
              )}

              {checkboxField(
                'selfFamilySeniorCitizen',
                'Self/family includes a senior citizen'
              )}

              {numberField(
                'section80DParents',
                '80D: Parents'
              )}

              {checkboxField(
                'parentsSeniorCitizen',
                'Parents include a senior citizen'
              )}

              {numberField(
                'section80GEligible',
                '80G: Eligible Donation Deduction',
                'Enter eligible deduction amount'
              )}
            </div>

            {/* Housing */}
            <div className="card">
              <h3 style={{
                marginBottom: '16px',
                fontSize: '15px',
                fontFamily: 'Outfit,sans-serif'
              }}>
                🏠 Housing Deductions
              </h3>

              {numberField(
                'hraExemption',
                'HRA Exemption',
                'Enter calculated eligible amount'
              )}

              {numberField(
                'homeLoanInterestDeduction',
                'Home Loan Interest',
                'Enter eligible deduction amount'
              )}

              <div className="disclaimer">
                Enter the eligible HRA exemption and home-loan deduction,
                not the full rent allowance or loan principal.
              </div>
            </div>

            {/* NPS and Education Loan */}
            <div className="card">
              <h3 style={{
                marginBottom: '16px',
                fontSize: '15px',
                fontFamily: 'Outfit,sans-serif'
              }}>
                🎓 NPS & Education Loan
              </h3>

              {numberField(
                'nps80CCD1B',
                'Personal NPS: 80CCD(1B)',
                'Old regime limit ₹50,000'
              )}

              {numberField(
                'employerNpsContribution',
                'Employer NPS Contribution'
              )}

              {numberField(
                'salaryForNps',
                'Salary for Employer NPS Limit'
              )}

              <div className="form-group">
                <label className="form-label">Employer Category</label>
                <select
                  className="form-select"
                  value={ded.employerType}
                  onChange={e => setDed(previous => ({
                    ...previous,
                    employerType: e.target.value
                  }))}
                >
                  <option value="other">Other employer</option>
                  <option value="central">Central Government</option>
                  <option value="state">State Government</option>
                </select>
              </div>

              {numberField(
                'educationLoanInterest',
                'Education Loan Interest',
                'Eligible interest only'
              )}
            </div>

            {/* Calculate */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="disclaimer">
                ⚠️ This calculator is an estimate. Eligibility for HRA,
                home-loan interest, donations and other deductions must
                be checked against the applicable tax rules.
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  className="btn btn-accent btn-lg"
                  onClick={calculate}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading
                    ? '⏳ Calculating…'
                    : '📊 Calculate Tax & Compare Regimes'}
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setDed(INIT_DED);
                    setResult(null);
                    setTips([]);
                  }}
                >
                  Reset Deductions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {active === 'results' && (
          <div className="slide-up">
            {!result ? (
              <div className="card">
                <p>
                  Enter your details and calculate tax to see your results.
                </p>
                <button
                  className="btn btn-accent"
                  onClick={() => setActive('inputs')}
                  style={{ marginTop: '12px' }}
                >
                  Go to Inputs
                </button>
              </div>
            ) : (
              <>
                {/* Regime Comparison */}
                <div className="regime-cards" style={{ marginBottom: '20px' }}>
                  {[
                    {
                      key: 'oldRegime',
                      label: '🔵 Old Regime',
                      regime: 'old'
                    },
                    {
                      key: 'newRegime',
                      label: '🟢 New Regime',
                      regime: 'new'
                    }
                  ].map(({ key, label, regime }) => {
                    const data = result[key];
                    const winner =
                      result.recommendation.regime === regime;

                    return (
                      <div
                        key={key}
                        className={`regime-card ${
                          winner ? 'winner' : 'loser'
                        }`}
                      >
                        {winner && (
                          <div
                            className="badge badge-green"
                            style={{ marginBottom: '10px' }}
                          >
                            ✅ Recommended
                          </div>
                        )}

                        <h3 style={{
                          fontSize: '15px',
                          marginBottom: '12px',
                          fontFamily: 'Outfit,sans-serif'
                        }}>
                          {label}
                        </h3>

                        <div className="regime-tax">
                          {fmt(data.totalTax)}
                        </div>

                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginBottom: '14px'
                        }}>
                          Total tax including cess
                        </div>

                        {renderRegimeBreakdown(data)}
                      </div>
                    );
                  })}
                </div>

                {/* Recommendation */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  background: 'var(--grad-success)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <span style={{ fontSize: '28px' }}>💰</span>
                  <div>
                    <div style={{
                      fontFamily: 'Outfit,sans-serif',
                      fontSize: '18px',
                      fontWeight: 800
                    }}>
                      {result.recommendation.regime === 'new'
                        ? 'New'
                        : 'Old'} Regime saves you{' '}
                      {fmt(result.recommendation.savings)}
                    </div>

                    <div style={{
                      fontSize: '13px',
                      opacity: .85,
                      marginTop: '2px'
                    }}>
                      {result.recommendation.message}
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="card" style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    fontSize: '14px',
                    marginBottom: '14px',
                    fontFamily: 'Outfit,sans-serif'
                  }}>
                    📊 Regime Comparison
                  </h3>

                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: 'var(--text-secondary)',
                          fontSize: 12
                        }}
                      />
                      <YAxis
                        tickFormatter={v =>
                          `₹${(v / 100000).toFixed(0)}L`
                        }
                        tick={{
                          fill: 'var(--text-secondary)',
                          fontSize: 11
                        }}
                      />
                      <Tooltip
                        formatter={v => [fmt(v), 'Tax']}
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar
                        dataKey="tax"
                        fill="var(--accent)"
                        radius={[6, 6, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <rect
                            key={index}
                            fill={entry.fill}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Fuzzy Analysis */}
                {result.fuzzyAnalysis && (
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{
                      fontSize: '14px',
                      marginBottom: '12px',
                      fontFamily: 'Outfit,sans-serif'
                    }}>
                      🧠 AI Fuzzy Analysis
                    </h3>

                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap',
                      marginBottom: '10px'
                    }}>
                      <span className="badge badge-blue">
                        Income Level: {
                          result.fuzzyAnalysis.incomeLevel?.high > .5
                            ? 'High'
                            : result.fuzzyAnalysis.incomeLevel?.medium > .5
                              ? 'Medium'
                              : 'Low'
                        }
                      </span>

                      <span className="badge badge-purple">
                        Deduction Level: {
                          result.fuzzyAnalysis.deductionLevel?.high > .5
                            ? 'High'
                            : result.fuzzyAnalysis.deductionLevel?.medium > .5
                              ? 'Medium'
                              : 'Low'
                        }
                      </span>

                      <span className="badge badge-yellow">
                        Complexity: {
                          result.fuzzyAnalysis.complexity?.high > .5
                            ? 'High'
                            : result.fuzzyAnalysis.complexity?.medium > .5
                              ? 'Medium'
                              : 'Low'
                        }
                      </span>

                      <span className="badge badge-green">
                        Confidence: {result.fuzzyAnalysis.confidence}%
                      </span>
                    </div>

                    {result.fuzzyAnalysis.suggestCA && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(251,191,36,.08)',
                        border: '1px solid rgba(251,191,36,.25)',
                        fontSize: '13px',
                        color: 'var(--warning)'
                      }}>
                        👨‍💼 {result.fuzzyAnalysis.caReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Optimization Tips */}
                {tips.length > 0 && (
                  <div className="card">
                    <h3 style={{
                      fontSize: '14px',
                      marginBottom: '14px',
                      fontFamily: 'Outfit,sans-serif'
                    }}>
                      💡 Deduction Optimization Tips
                    </h3>

                    {tips.map((tip, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'var(--bg-elevated)',
                        marginBottom: '8px',
                        border: '1px solid var(--border)',
                        alignItems: 'flex-start'
                      }}>
                        <span style={{ fontSize: '20px' }}>
                          {tip.icon}
                        </span>

                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 600
                          }}>
                            {tip.section}
                          </div>

                          <div style={{
                            fontSize: '12.5px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            {tip.action}
                          </div>
                        </div>

                        <span className={`badge badge-${
                          tip.priority === 'high'
                            ? 'red'
                            : tip.priority === 'medium'
                              ? 'yellow'
                              : 'blue'
                        }`}>
                          {tip.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActive('inputs')}
                  style={{ marginTop: '12px' }}
                >
                  ← Back to Inputs
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
