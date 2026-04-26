// src/components/Goals/GoalsPage.js
import React, { useState } from 'react';
import { taxAPI } from '../../utils/api';
import { calcTax, fmt } from '../../utils/taxEngine';
import toast from 'react-hot-toast';

const GOALS = [
  { key:'save_max_tax',       icon:'💰', label:'Save Maximum Tax',    desc:'Maximize every deduction under Old Regime' },
  { key:'balanced_strategy',  icon:'⚖️', label:'Balanced Strategy',   desc:'Balance tax saving with investment growth' },
  { key:'wealth_growth',      icon:'📈', label:'Wealth Growth',       desc:'Grow wealth via New Regime + market returns' },
];

const INIT_DED = { section80C:0, section80D:0, nps:0, hra:0, homeLoan:0, standardDeduction:50000 };

export default function GoalsPage() {
  const [goal,    setGoal]    = useState('balanced_strategy');
  const [income,  setIncome]  = useState(1200000);
  const [ded,     setDed]     = useState(INIT_DED);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const setD = (k) => (e) => setDed(d => ({ ...d, [k]: Number(e.target.value) || 0 }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await taxAPI.goalStrategy({ goal, income, currentDeductions: ded });
      setResult(data);
    } catch {
      // Fallback: client-side
      const current = calcTax(income, 'below60', ded);
      const mockStrategies = {
        save_max_tax      : { title:'Maximum Tax Saving Strategy', icon:'💰', regime:'old', estimatedSaving: Math.min(income*.15,150000), steps:['Max out 80C with ELSS+PPF (₹1.5L)','Add NPS ₹50K under 80CCD(1B)','Buy health insurance for 80D (₹25K)','Claim HRA if renting','Use home loan for Sec 24b (₹2L)','Donate to eligible NGOs for 80G'] },
        balanced_strategy : { title:'Balanced Tax + Investment',    icon:'⚖️', regime: income>1500000?'new':'old', estimatedSaving: Math.min(income*.10,100000), steps:['Invest ₹1.5L in ELSS (tax + returns)','Open NPS for ₹50K extra deduction','Keep 6-month emergency fund liquid','Buy term + health insurance','Review regime every April','SIP in index fund for long-term wealth'] },
        wealth_growth     : { title:'Wealth Growth Strategy',       icon:'📈', regime:'new', estimatedSaving: Math.min(income*.08,80000),  steps:['Switch to New Regime','Invest surplus in Nifty 50 index','Harvest LTCG ₹1.25L tax-free each year','Maximize EPF/VPF for debt portion','Use debt MF for < 3-year goals','Tax-loss harvest in March'] },
      };
      setResult({ strategy: mockStrategies[goal], currentTax: current });
      toast('Using offline strategy engine', { icon:'ℹ️' });
    } finally { setLoading(false); }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">🎯 Goal-Based Tax Planning</div>
          <div className="page-sub">Choose your financial goal · Get a personalised strategy</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:'20px', alignItems:'start' }}>

          {/* Left – inputs */}
          <div>
            <div className="card" style={{ marginBottom:'16px' }}>
              <h3 style={{ fontSize:'15px', marginBottom:'16px', fontFamily:'Outfit,sans-serif' }}>💼 Your Details</h3>
              <div className="form-group">
                <label className="form-label">Annual Gross Income (₹)</label>
                <input className="form-input" type="number" value={income} onChange={e=>setIncome(Number(e.target.value)||0)} min={0} />
                <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>≈ ₹{(income/100000).toFixed(1)} Lakh/year</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {[
                  { k:'section80C', label:'80C Investments', ph:'e.g. 150000' },
                  { k:'section80D', label:'80D Insurance',   ph:'e.g. 25000'  },
                  { k:'nps',        label:'NPS (80CCD)',      ph:'e.g. 50000'  },
                  { k:'hra',        label:'HRA Exempt',       ph:'e.g. 120000' },
                ].map(f => (
                  <div className="form-group" key={f.k}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type="number" placeholder={f.ph} value={ded[f.k]} onChange={setD(f.k)} min={0} />
                  </div>
                ))}
              </div>
            </div>

            {/* Goal selector */}
            <div className="card" style={{ marginBottom:'16px' }}>
              <h3 style={{ fontSize:'15px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>🎯 Select Your Goal</h3>
              {GOALS.map(g => (
                <div key={g.key} onClick={() => setGoal(g.key)} style={{
                  display:'flex', alignItems:'center', gap:'12px',
                  padding:'12px 14px', borderRadius:'10px', marginBottom:'8px',
                  border:`2px solid ${goal===g.key ? 'var(--accent)' : 'var(--border)'}`,
                  background: goal===g.key ? 'rgba(56,189,248,.07)' : 'var(--bg-elevated)',
                  cursor:'pointer', transition:'all .2s'
                }}>
                  <span style={{ fontSize:'24px' }}>{g.icon}</span>
                  <div>
                    <div style={{ fontSize:'13.5px', fontWeight:600 }}>{g.label}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>{g.desc}</div>
                  </div>
                  {goal===g.key && <span style={{ marginLeft:'auto', color:'var(--accent)', fontSize:'18px' }}>✓</span>}
                </div>
              ))}
            </div>

            <button className="btn btn-accent" style={{ width:'100%', padding:'12px' }} onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Generating…' : '🎯 Get My Strategy'}
            </button>
          </div>

          {/* Right – strategy result */}
          <div>
            {result ? (
              <div className="slide-up">
                {/* Strategy card */}
                <div className="card" style={{ marginBottom:'14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
                    <span style={{ fontSize:'32px' }}>{result.strategy.icon}</span>
                    <div>
                      <h3 style={{ fontSize:'16px', fontFamily:'Outfit,sans-serif' }}>{result.strategy.title}</h3>
                      <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginTop:'4px' }}>{result.strategy.description}</p>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
                    <div className={`badge badge-${result.strategy.regime==='new'?'blue':'green'}`}>
                      Recommended: {result.strategy.regime === 'new' ? '🟢 New Regime' : '🔵 Old Regime'}
                    </div>
                    <div className="badge badge-yellow">
                      Save ~{fmt(result.strategy.estimatedSaving)}
                    </div>
                  </div>

                  <h4 style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.5px' }}>
                    Action Steps
                  </h4>
                  {result.strategy.steps.map((step, i) => (
                    <div key={i} style={{
                      display:'flex', gap:'10px', padding:'10px 12px',
                      borderRadius:'8px', marginBottom:'6px',
                      background:'var(--bg-elevated)', border:'1px solid var(--border)',
                      alignItems:'flex-start'
                    }}>
                      <div style={{
                        width:'22px', height:'22px', borderRadius:'50%', flexShrink:0,
                        background:'var(--grad-accent)', display:'flex',
                        alignItems:'center', justifyContent:'center',
                        fontSize:'11px', fontWeight:700, color:'#fff'
                      }}>{i+1}</div>
                      <p style={{ fontSize:'13px', margin:0, lineHeight:1.5 }}>{step}</p>
                    </div>
                  ))}
                </div>

                {/* Current tax summary */}
                {result.currentTax && (
                  <div className="card">
                    <h3 style={{ fontSize:'14px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>📊 Current Tax Snapshot</h3>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                      {[
                        { label:'Old Regime Tax',   val: fmt(result.currentTax.oldRegime?.tax  || result.currentTax.oldRegime?.totalTax || 0), col:'var(--indigo)' },
                        { label:'New Regime Tax',   val: fmt(result.currentTax.newRegime?.tax  || result.currentTax.newRegime?.totalTax || 0), col:'var(--accent)' },
                        { label:'Best Regime',      val: result.currentTax.recommended==='old' ? '🔵 Old' : '🟢 New', col:'var(--success)' },
                        { label:'Tax Savings Possible', val: fmt(result.currentTax.savings||0), col:'var(--warning)' },
                      ].map(s => (
                        <div key={s.label} style={{ padding:'12px', borderRadius:'8px', background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:'11.5px', color:'var(--text-muted)', marginBottom:'4px' }}>{s.label}</div>
                          <div style={{ fontSize:'15px', fontWeight:700, color:s.col }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign:'center', padding:'50px 24px' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px' }}>🎯</div>
                <h3 style={{ fontSize:'16px', marginBottom:'8px', fontFamily:'Outfit,sans-serif' }}>Set Your Financial Goal</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'13.5px', lineHeight:1.6 }}>
                  Choose a goal and fill in your income details to get a personalised tax strategy with step-by-step action plan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
