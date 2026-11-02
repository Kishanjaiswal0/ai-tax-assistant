
import React, { useState, useCallback } from 'react';
import { taxAPI } from '../../utils/api';
import { fmt } from '../../utils/taxEngine';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';

export default function SimulationPage() {
  const [income, setIncome] = useState(1000000);
  const [invest, setInvest] = useState(100000);
  const [hra, setHra] = useState(60000);
  const [homeLoan, setHomeLoan] = useState(0);
  const [age, setAge] = useState('below60');

  const [taxYear, setTaxYear] = useState('FY2025-26');
  const [residentialStatus, setResidentialStatus] = useState('resident');
  const [isSalaried, setIsSalaried] = useState(true);
  const [salaryIncome, setSalaryIncome] = useState(1000000);

  const [result, setResult] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildPayload = (grossIncome, salaryAmount = salaryIncome) => ({
    grossIncome,
    age,
    taxYear,
    residentialStatus,
    deductions: {
      isSalariedOrPensioner: isSalaried,
      salaryOrPensionIncome: isSalaried ? salaryAmount : 0,
      section80C: Math.min(invest, 150000),
      section80DSelfFamily: 0,
      section80DParents: 0,
      hraExemption: hra,
      homeLoanInterestDeduction: homeLoan,
      nps80CCD1B: 0,
      employerNpsContribution: 0,
      salaryForNps: isSalaried ? salaryAmount : 0,
      employerType: 'other',
      educationLoanInterest: 0,
      section80GEligible: 0
    }
  });

  const normalizeResult = (response) => {
    const data = response?.data || response;

    if (!data?.oldRegime || !data?.newRegime) {
      throw new Error('The server returned an unexpected tax calculation response.');
    }

    const oldTax = Number(
      data.oldRegime.totalTax ?? data.oldRegime.tax ?? 0
    );

    const newTax = Number(
      data.newRegime.totalTax ?? data.newRegime.tax ?? 0
    );

    return {
      ...data,
      oldRegime: {
        ...data.oldRegime,
        tax: oldTax,
        rate: Number(
          data.oldRegime.effectiveRate ??
          data.oldRegime.rate ??
          (data.grossIncome ? (oldTax / data.grossIncome) * 100 : 0)
        )
      },
      newRegime: {
        ...data.newRegime,
        tax: newTax,
        rate: Number(
          data.newRegime.effectiveRate ??
          data.newRegime.rate ??
          (data.grossIncome ? (newTax / data.grossIncome) * 100 : 0)
        )
      }
    };
  };

  const calculateSimulation = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Calculate the selected income using the backend tax engine.
      const response = await taxAPI.calculate(buildPayload(income));
      const calculated = normalizeResult(response);

      setResult(calculated);

      // Generate chart points using backend calculations as well.
      // These requests happen only after the user clicks Calculate.
      const incomes = [
        300000,
        800000,
        1300000,
        1800000,
        2300000,
        2800000,
        3300000,
        3800000,
        4300000,
        4800000
      ];

      const chartResults = await Promise.all(
        incomes.map(async (amount) => {
          const salaryAmount = isSalaried
            ? Math.min(salaryIncome, amount)
            : 0;

          const chartResponse = await taxAPI.calculate(
            buildPayload(amount, salaryAmount)
          );

          const calculatedPoint = normalizeResult(chartResponse);

          return {
            income: Math.round(amount / 100000),
            Old: calculatedPoint.oldRegime.tax,
            New: calculatedPoint.newRegime.tax
          };
        })
      );

      setChartData(chartResults);
    } catch (err) {
      console.error('Simulation calculation error:', err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to calculate simulation. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    income,
    invest,
    hra,
    homeLoan,
    age,
    taxYear,
    residentialStatus,
    isSalaried,
    salaryIncome
  ]);

  const applyPreset = (scenario) => {
    setIncome(scenario.income);
    setInvest(scenario.invest);
    setHra(scenario.hra);
    setHomeLoan(scenario.hl);
    setSalaryIncome(scenario.income);
    setIsSalaried(true);
    setResult(null);
    setChartData([]);
    setError('');
  };

  const saved = result
    ? result.oldRegime.tax - result.newRegime.tax
    : 0;

  const bestRegime = saved > 0 ? 'New' : 'Old';

  const totalDeductions = result
    ? Number(
        result.oldRegime.deductions?.total ??
        result.oldRegime.totalDeductions ??
        result.deductions?.total ??
        0
      )
    : 0;

  const oldTaxableIncome = result
    ? Number(result.oldRegime.taxableIncome ?? 0)
    : 0;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📈 What-if Simulation</div>
          <div className="page-sub">
            Adjust your financial details and calculate the tax impact
          </div>
        </div>
      </div>

      <div className="page-body">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.4fr',
            gap: '20px',
            alignItems: 'start'
          }}
        >
          {/* Sliders and parameters */}
          <div>
            <div className="card" style={{ marginBottom: '14px' }}>
              <h3
                style={{
                  fontSize: '15px',
                  marginBottom: '18px',
                  fontFamily: 'Outfit,sans-serif'
                }}
              >
                ⚙️ Adjust Parameters
              </h3>

              <div className="form-group">
                <label className="form-label">Tax Period</label>
                <select
                  className="form-select"
                  value={taxYear}
                  onChange={(e) => {
                    setTaxYear(e.target.value);
                    setResult(null);
                    setChartData([]);
                  }}
                >
                  <option value="FY2024-25">
                    FY 2024-25 (AY 2025-26)
                  </option>
                  <option value="FY2025-26">
                    FY 2025-26 (AY 2026-27)
                  </option>
                  <option value="TY2026-27">
                    TY 2026-27
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Residential Status</label>
                <select
                  className="form-select"
                  value={residentialStatus}
                  onChange={(e) => {
                    setResidentialStatus(e.target.value);
                    setResult(null);
                    setChartData([]);
                  }}
                >
                  <option value="resident">Resident</option>
                  <option value="non-resident">Non-Resident</option>
                 <option value="not-ordinarily-resident">
  Resident but Not Ordinarily Resident
</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Age Group</label>
                <select
                  className="form-select"
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value);
                    setResult(null);
                    setChartData([]);
                  }}
                >
                  <option value="below60">Below 60 years</option>
                  <option value="60to80">60–80 years (Senior)</option>
                  <option value="above80">Above 80 (Super Senior)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Employment Category
                </label>
                <select
                  className="form-select"
                  value={isSalaried ? 'salaried' : 'other'}
                  onChange={(e) => {
                    const salaried = e.target.value === 'salaried';
                    setIsSalaried(salaried);
                    setSalaryIncome(salaried ? income : 0);
                    setResult(null);
                    setChartData([]);
                  }}
                >
                  <option value="salaried">Salaried / Pensioner</option>
                  <option value="other">Other Income</option>
                </select>
              </div>

              {isSalaried && (
                <SliderField
                  label="Salary / Pension Income"
                  value={salaryIncome}
                  min={0}
                  max={income}
                  step={50000}
                  onChange={(value) => {
                    setSalaryIncome(value);
                    setResult(null);
                    setChartData([]);
                  }}
                  display={fmt(salaryIncome)}
                  color="var(--accent)"
                  note="Eligible salary amount"
                />
              )}

              <SliderField
                label="Annual Gross Income"
                value={income}
                min={300000}
                max={5000000}
                step={50000}
                onChange={(value) => {
                  setIncome(value);
                  setSalaryIncome((previous) =>
                    Math.min(previous, value)
                  );
                  setResult(null);
                  setChartData([]);
                }}
                display={`₹${(income / 100000).toFixed(1)}L`}
                color="var(--accent)"
              />

              <SliderField
                label="80C Investment (PPF/ELSS/LIC)"
                value={invest}
                min={0}
                max={150000}
                step={5000}
                onChange={(value) => {
                  setInvest(value);
                  setResult(null);
                  setChartData([]);
                }}
                display={fmt(invest)}
                color="var(--indigo)"
                note="Max ₹1.5L"
              />

              <SliderField
                label="HRA Exemption"
                value={hra}
                min={0}
                max={300000}
                step={5000}
                onChange={(value) => {
                  setHra(value);
                  setResult(null);
                  setChartData([]);
                }}
                display={fmt(hra)}
                color="var(--success)"
                note="Exempt amount"
              />

              <SliderField
                label="Home Loan Interest (Sec 24b)"
                value={homeLoan}
                min={0}
                max={200000}
                step={10000}
                onChange={(value) => {
                  setHomeLoan(value);
                  setResult(null);
                  setChartData([]);
                }}
                display={fmt(homeLoan)}
                color="var(--warning)"
                note="Max ₹2L"
              />

              <button
                onClick={calculateSimulation}
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '12px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'DM Sans,sans-serif'
                }}
              >
                {loading ? 'Calculating...' : 'Calculate Simulation →'}
              </button>

              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginTop: '9px'
                }}
              >
                Results are calculated by the backend tax engine.
                Click Calculate Simulation after changing parameters.
              </p>
            </div>

            {/* Preset scenarios */}
            <div className="card">
              <h3
                style={{
                  fontSize: '14px',
                  marginBottom: '12px',
                  fontFamily: 'Outfit,sans-serif'
                }}
              >
                ⚡ Preset Scenarios
              </h3>

              {[
                {
                  label: 'Fresh Graduate',
                  income: 600000,
                  invest: 50000,
                  hra: 0,
                  hl: 0
                },
                {
                  label: 'Mid-Career Salaried',
                  income: 1200000,
                  invest: 150000,
                  hra: 120000,
                  hl: 0
                },
                {
                  label: 'Senior Professional',
                  income: 2000000,
                  invest: 150000,
                  hra: 0,
                  hl: 200000
                },
                {
                  label: 'High Earner',
                  income: 3500000,
                  invest: 150000,
                  hra: 0,
                  hl: 200000
                }
              ].map((scenario) => (
                <button
                  key={scenario.label}
                  onClick={() => applyPreset(scenario)}
                  style={{
                    width: '100%',
                    marginBottom: '7px',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'DM Sans,sans-serif',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    transition: 'all .2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--accent)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--border)')
                  }
                >
                  <span>{scenario.label}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    ₹{scenario.income / 100000}L
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div>
            {error && (
              <div
                className="card"
                style={{
                  marginBottom: '14px',
                  border: '1px solid rgba(239,68,68,.4)',
                  color: 'var(--danger, #ef4444)',
                  fontSize: '13px'
                }}
              >
                {error}
              </div>
            )}

            {!result && !loading && (
              <div className="card" style={{ marginBottom: '14px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontFamily: 'Outfit,sans-serif'
                  }}
                >
                  📊 Your Simulation Results
                </h3>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    marginTop: '10px'
                  }}
                >
                  Adjust your parameters and click Calculate Simulation
                  to compare your Old and New Regime tax estimates.
                </p>
              </div>
            )}

            {loading && (
              <div className="card" style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Calculating your tax results and income comparison chart...
                </p>
              </div>
            )}

            {result && (
              <>
                <div className="card" style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '15px',
                        fontFamily: 'Outfit,sans-serif'
                      }}
                    >
                      📊 Results
                    </h3>
                    <div
                      className={`badge badge-${bestRegime === 'New' ? 'blue' : 'green'}`}
                      style={{ fontSize: '13px', padding: '5px 12px' }}
                    >
                      ✅ {bestRegime} Regime Wins
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '12px'
                    }}
                  >
                    {taxYear} · {residentialStatus} · {age}
                  </div>

                  <div className="regime-cards">
                    {[
                      {
                        label: '🔵 Old Regime',
                        tax: result.oldRegime.tax,
                        rate: result.oldRegime.rate,
                        col: 'var(--indigo)',
                        regime: 'old'
                      },
                      {
                        label: '🟢 New Regime',
                        tax: result.newRegime.tax,
                        rate: result.newRegime.rate,
                        col: 'var(--accent)',
                        regime: 'new'
                      }
                    ].map((regime) => {
                      const isWin =
                        (saved > 0 && regime.regime === 'new') ||
                        (saved <= 0 && regime.regime === 'old');

                      return (
                        <div
                          key={regime.regime}
                          className={`regime-card ${isWin ? 'winner' : 'loser'}`}
                        >
                          <h4
                            style={{
                              fontSize: '13px',
                              marginBottom: '8px'
                            }}
                          >
                            {regime.label}
                          </h4>

                          <div
                            style={{
                              fontFamily: 'Outfit,sans-serif',
                              fontSize: '26px',
                              fontWeight: 800,
                              color: regime.col
                            }}
                          >
                            {fmt(regime.tax)}
                          </div>

                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                              marginTop: '4px'
                            }}
                          >
                            Effective rate: {regime.rate.toFixed(2)}%
                          </div>

                          <div className="progress" style={{ marginTop: '10px' }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(regime.rate * 3, 100)}%`,
                                background: regime.col
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: `rgba(${saved > 0 ? '56,189,248' : '52,211,153'},.08)`,
                      border: `1px solid rgba(${saved > 0 ? '56,189,248' : '52,211,153'},.25)`,
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>💰</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>
                        {bestRegime} Regime saves{' '}
                        <span style={{ color: 'var(--success)' }}>
                          {fmt(Math.abs(saved))}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          marginTop: '2px'
                        }}
                      >
                        Old regime taxable income: {fmt(oldTaxableIncome)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tax vs income chart */}
                <div className="card">
                  <h3
                    style={{
                      fontSize: '14px',
                      marginBottom: '14px',
                      fontFamily: 'Outfit,sans-serif'
                    }}
                  >
                    📉 Tax vs Income (with your deductions)
                  </h3>

                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ right: 10 }}>
                        <XAxis
                          dataKey="income"
                          tickFormatter={(value) => `₹${value}L`}
                          tick={{
                            fill: 'var(--text-secondary)',
                            fontSize: 11
                          }}
                        />
                        <YAxis
                          tickFormatter={(value) =>
                            `₹${(value / 100000).toFixed(0)}L`
                          }
                          tick={{
                            fill: 'var(--text-secondary)',
                            fontSize: 11
                          }}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            fmt(value),
                            name + ' Regime'
                          ]}
                          labelFormatter={(value) =>
                            `Income: ₹${value}L`
                          }
                          contentStyle={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="Old"
                          stroke="var(--indigo)"
                          fill="rgba(99,102,241,.1)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="New"
                          stroke="var(--accent)"
                          fill="rgba(56,189,248,.1)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Chart data is not available yet.
                    </p>
                  )}

                  <p
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginTop: '8px',
                      textAlign: 'center'
                    }}
                  >
                    Tax estimates across income levels using the selected
                    tax period and deduction settings.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable slider component
function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  color,
  note
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}
      >
        <label className="form-label" style={{ margin: 0 }}>
          {label}
        </label>

        <div
          style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}
        >
          {note && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {note}
            </span>
          )}
          <span
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color,
              fontFamily: 'JetBrains Mono,monospace'
            }}
          >
            {display}
          </span>
        </div>
      </div>

      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--c': color }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10.5px',
          color: 'var(--text-muted)',
          marginTop: '3px'
        }}
      >
        <span>{min >= 100000 ? `₹${min / 100000}L` : fmt(min)}</span>
        <span>{max >= 100000 ? `₹${max / 100000}L` : fmt(max)}</span>
      </div>
    </div>
  );
}
