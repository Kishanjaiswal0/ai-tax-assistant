// src/components/Calculator/CalculatorPage.js
import React, { useState } from 'react';
import { taxAPI } from '../../utils/api';
import { calcTax, fmt } from '../../utils/taxEngine';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const INIT_DED = { section80C:0, section80D:0, hra:0, homeLoan:0, nps:0, standardDeduction:50000 };

export default function CalculatorPage() {
  const [income,   setIncome]   = useState(1200000);
  const [age,      setAge]      = useState('below60');
  const [ded,      setDed]      = useState(INIT_DED);
  const [result,   setResult]   = useState(null);
  const [tips,     setTips]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [active,   setActive]   = useState('inputs');

  // Live preview (client-side) while typing
  const live = calcTax(income, age, ded);

  const setD = (k) => (e) => setDed(d => ({ ...d, [k]: Number(e.target.value) || 0 }));

  const calculate = async () => {
    setLoading(true);
    try {
      const { data } = await taxAPI.calculate({ grossIncome:income, age, deductions:ded });
      setResult(data);
      setTips(data.optimizationTips || []);
      setActive('results');
    } catch {
      toast.error('Calculation failed. Using offline engine.');
      setResult({ ...live, optimizationTips:[] });
      setActive('results');
    } finally { setLoading(false); }
  };

  const chartData = result ? [
    { name:'Old Regime', tax: result.oldRegime?.totalTax || live.oldRegime.tax, fill:'#6366f1' },
    { name:'New Regime', tax: result.newRegime?.totalTax || live.newRegime.tax, fill:'#38bdf8' },
  ] : [];

  const r = result || { oldRegime:{totalTax:live.oldRegime.tax, effectiveRate:live.oldRegime.rate, takeHome:income-live.oldRegime.tax},
                        newRegime:{totalTax:live.newRegime.tax, effectiveRate:live.newRegime.rate, takeHome:income-live.newRegime.tax},
                        recommendation:{regime:live.recommended, savings:live.savings} };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📊 Tax Calculator</div>
          <div className="page-sub">Old vs New Regime</div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {['inputs','results'].map(t => (
            <button key={t} onClick={() => setActive(t)} className={`btn btn-sm ${active===t?'btn-accent':'btn-ghost'}`}>
              {t === 'inputs' ? '⚙️ Inputs' : '📊 Results'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {active === 'inputs' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
            {/* Left: Income & Age */}
            <div className="card">
              <h3 style={{ marginBottom:'16px', fontSize:'15px', fontFamily:'Outfit,sans-serif' }}>💼 Income Details</h3>
              <div className="form-group">
                <label className="form-label">Annual Gross Income (₹)</label>
                <input className="form-input" type="number" value={income} onChange={e=>setIncome(Number(e.target.value))} min={0} />
                <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>
                  {income >= 100000 ? `₹${(income/100000).toFixed(1)} Lakh` : fmt(income)}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Age Group</label>
                <select className="form-select" value={age} onChange={e=>setAge(e.target.value)}>
                  <option value="below60">Below 60 years</option>
                  <option value="60to80">60 – 80 years (Senior)</option>
                  <option value="above80">Above 80 years (Super Senior)</option>
                </select>
              </div>

              {/* Live preview */}
              <div style={{ marginTop:'12px', padding:'12px', borderRadius:'10px', background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'8px' }}>⚡ Live preview</div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                  <span>Old Regime:</span>
                  <strong style={{ color:'var(--indigo)' }}>{fmt(live.oldRegime.tax)}</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginTop:'4px' }}>
                  <span>New Regime:</span>
                  <strong style={{ color:'var(--accent)' }}>{fmt(live.newRegime.tax)}</strong>
                </div>
                <div style={{ marginTop:'8px', padding:'6px 10px', borderRadius:'6px', background:`rgba(${live.recommended==='new'?'56,189,248':'52,211,153'},.1)`, fontSize:'12px' }}>
                  ✅ {live.recommended === 'new' ? 'New' : 'Old'} Regime saves {fmt(live.savings)}
                </div>
              </div>
            </div>

            {/* Right: Deductions */}
            <div className="card">
              <h3 style={{ marginBottom:'16px', fontSize:'15px', fontFamily:'Outfit,sans-serif' }}>💰 Deductions (Old Regime)</h3>
              {[
                { key:'standardDeduction', label:'Standard Deduction (auto)', max:50000, help:'Auto for salaried' },
                { key:'section80C',        label:'80C (PPF/ELSS/LIC/EPF)',   max:150000, help:'Max ₹1.5L' },
                { key:'section80D',        label:'80D (Health Insurance)',     max:50000,  help:'Max ₹25K-50K' },
                { key:'nps',               label:'80CCD(1B) NPS extra',       max:50000,  help:'Max ₹50K extra' },
                { key:'hra',               label:'HRA Exemption',             max:600000, help:'Actual exempt amount' },
                { key:'homeLoan',          label:'Section 24b (Home Loan)',    max:200000, help:'Max ₹2L interest' },
              ].map(d => (
                <div className="form-group" key={d.key}>
                  <label className="form-label">
                    {d.label} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>{d.help}</span>
                  </label>
                  <input className="form-input" type="number" value={ded[d.key]} onChange={setD(d.key)} min={0} max={d.max} />
                </div>
              ))}

              <div style={{ padding:'10px 14px', borderRadius:'8px', background:'rgba(52,211,153,.08)', border:'1px solid rgba(52,211,153,.2)', fontSize:'13px' }}>
                Total Deductions: <strong style={{ color:'var(--success)' }}>{fmt(Object.values(ded).reduce((a,v)=>a+v,0))}</strong>
              </div>
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <button className="btn btn-accent btn-lg" onClick={calculate} disabled={loading} style={{ width:'100%' }}>
                {loading ? '⏳ Calculating…' : '📊 Calculate Tax & Compare Regimes'}
              </button>
            </div>
          </div>
        )}

        {active === 'results' && result && (
          <div className="slide-up">
            {/* Regime comparison */}
            <div className="regime-cards" style={{ marginBottom:'20px' }}>
              {[
                { key:'oldRegime', label:'🔵 Old Regime', regime:'old' },
                { key:'newRegime', label:'🟢 New Regime', regime:'new' }
              ].map(({ key, label, regime }) => {
                const d = r[key];
                const isWinner = r.recommendation?.regime === regime;
                return (
                  <div key={key} className={`regime-card ${isWinner?'winner':'loser'}`}>
                    {isWinner && <div className="badge badge-green" style={{ marginBottom:'10px' }}>✅ Recommended</div>}
                    <h3 style={{ fontSize:'15px', marginBottom:'12px', fontFamily:'Outfit,sans-serif' }}>{label}</h3>
                    <div className="regime-tax">{fmt(d.totalTax)}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'14px' }}>Total tax + cess</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px', fontSize:'13px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'var(--text-secondary)' }}>Effective Rate</span>
                        <strong>{d.effectiveRate}%</strong>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ color:'var(--text-secondary)' }}>Take-home</span>
                        <strong style={{ color:'var(--success)' }}>{fmt(d.takeHome)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Savings callout */}
            <div style={{
              padding:'16px 20px', borderRadius:'12px', marginBottom:'20px',
              background:'var(--grad-success)', color:'#fff',
              display:'flex', alignItems:'center', gap:'14px'
            }}>
              <span style={{ fontSize:'28px' }}>💰</span>
              <div>
                <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'18px', fontWeight:800 }}>
                  {r.recommendation?.regime === 'new' ? 'New' : 'Old'} Regime saves you {fmt(r.recommendation?.savings || 0)}
                </div>
                <div style={{ fontSize:'13px', opacity:.85, marginTop:'2px' }}>
                  {r.recommendation?.message || 'Choose the regime that minimizes your tax outgo.'}
                </div>
              </div>
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div className="card" style={{ marginBottom:'20px' }}>
                <h3 style={{ fontSize:'14px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>📊 Regime Comparison</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill:'var(--text-secondary)', fontSize:12 }} />
                    <YAxis tickFormatter={v=>`₹${(v/100000).toFixed(0)}L`} tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                    <Tooltip formatter={v=>[fmt(v),'Tax']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px' }} />
                    <Bar dataKey="tax" fill="var(--accent)" radius={[6,6,0,0]}>
                      {chartData.map((e,i)=>(<rect key={i} fill={e.fill}/>))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Fuzzy logic result */}
            {result.fuzzyAnalysis && (
              <div className="card" style={{ marginBottom:'20px' }}>
                <h3 style={{ fontSize:'14px', marginBottom:'12px', fontFamily:'Outfit,sans-serif' }}>🧠 AI Fuzzy Analysis</h3>
                <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'10px' }}>
                  <span className="badge badge-blue">Income Level: {
                    result.fuzzyAnalysis.incomeLevel?.high > .5 ? 'High' :
                    result.fuzzyAnalysis.incomeLevel?.medium > .5 ? 'Medium' : 'Low'
                  }</span>
                  <span className="badge badge-purple">Deduction Level: {
                    result.fuzzyAnalysis.deductionLevel?.high > .5 ? 'High' :
                    result.fuzzyAnalysis.deductionLevel?.medium > .5 ? 'Medium' : 'Low'
                  }</span>
                  <span className="badge badge-yellow">Complexity: {
                    result.fuzzyAnalysis.complexity?.high > .5 ? 'High' :
                    result.fuzzyAnalysis.complexity?.medium > .5 ? 'Medium' : 'Low'
                  }</span>
                  <span className="badge badge-green">Confidence: {result.fuzzyAnalysis.confidence}%</span>
                </div>
                {result.fuzzyAnalysis.suggestCA && (
                  <div style={{ padding:'10px 14px', borderRadius:'8px', background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.25)', fontSize:'13px', color:'var(--warning)' }}>
                    👨‍💼 {result.fuzzyAnalysis.caReason}
                  </div>
                )}
              </div>
            )}

            {/* Optimization tips */}
            {tips.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize:'14px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>💡 Deduction Optimization Tips</h3>
                {tips.map((tip, i) => (
                  <div key={i} style={{
                    display:'flex', gap:'12px', padding:'12px', borderRadius:'8px',
                    background:'var(--bg-elevated)', marginBottom:'8px',
                    border:'1px solid var(--border)', alignItems:'flex-start'
                  }}>
                    <span style={{ fontSize:'20px' }}>{tip.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:600 }}>{tip.section}</div>
                      <div style={{ fontSize:'12.5px', color:'var(--text-secondary)', marginTop:'2px' }}>{tip.action}</div>
                    </div>
                    <span className={`badge badge-${tip.priority==='high'?'red':tip.priority==='medium'?'yellow':'blue'}`}>
                      {tip.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-ghost btn-sm" onClick={() => setActive('inputs')} style={{ marginTop:'12px' }}>
              ← Back to Inputs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
