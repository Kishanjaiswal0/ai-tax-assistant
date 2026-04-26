// src/components/Simulation/SimulationPage.js
import React, { useState, useMemo } from 'react';
import { calcTax, fmt } from '../../utils/taxEngine';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

export default function SimulationPage() {
  const [income,  setIncome]  = useState(1000000);
  const [invest,  setInvest]  = useState(100000);
  const [hra,     setHra]     = useState(60000);
  const [homeLoan,setHomeLoan]= useState(0);
  const [age,     setAge]     = useState('below60');

  const result = useMemo(() => {
    const deductions = { section80C:Math.min(invest,150000), hra, homeLoan, standardDeduction:50000 };
    return calcTax(income, age, deductions);
  }, [income, invest, hra, homeLoan, age]);

  // Generate income sweep data for chart
  const chartData = useMemo(() => {
    const points = [];
    for (let inc = 300000; inc <= 3000000; inc += 100000) {
      const d = { section80C:Math.min(invest,150000), hra, homeLoan, standardDeduction:50000 };
      const r = calcTax(inc, age, d);
      points.push({
        income : Math.round(inc/100000),
        Old    : r.oldRegime.tax,
        New    : r.newRegime.tax,
      });
    }
    return points;
  }, [invest, hra, homeLoan, age]);

  const saved   = result.oldRegime.tax - result.newRegime.tax;
  const bestRegime = saved > 0 ? 'New' : 'Old';

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📈 What-if Simulation</div>
          <div className="page-sub">Drag sliders to see real-time tax impact</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:'20px', alignItems:'start' }}>

          {/* Sliders */}
          <div>
            <div className="card" style={{ marginBottom:'14px' }}>
              <h3 style={{ fontSize:'15px', marginBottom:'18px', fontFamily:'Outfit,sans-serif' }}>⚙️ Adjust Parameters</h3>

              {/* Age */}
              <div className="form-group">
                <label className="form-label">Age Group</label>
                <select className="form-select" value={age} onChange={e=>setAge(e.target.value)}>
                  <option value="below60">Below 60 years</option>
                  <option value="60to80">60–80 years (Senior)</option>
                  <option value="above80">Above 80 (Super Senior)</option>
                </select>
              </div>

              {/* Income slider */}
              <SliderField
                label="Annual Income"
                value={income}
                min={300000} max={5000000} step={50000}
                onChange={setIncome}
                display={`₹${(income/100000).toFixed(1)}L`}
                color="var(--accent)"
              />

              {/* Investment slider */}
              <SliderField
                label="80C Investment (PPF/ELSS/LIC)"
                value={invest}
                min={0} max={150000} step={5000}
                onChange={setInvest}
                display={fmt(invest)}
                color="var(--indigo)"
                note="Max ₹1.5L"
              />

              {/* HRA slider */}
              <SliderField
                label="HRA Exemption"
                value={hra}
                min={0} max={300000} step={5000}
                onChange={setHra}
                display={fmt(hra)}
                color="var(--success)"
                note="Actual exempt amount"
              />

              {/* Home Loan slider */}
              <SliderField
                label="Home Loan Interest (Sec 24b)"
                value={homeLoan}
                min={0} max={200000} step={10000}
                onChange={setHomeLoan}
                display={fmt(homeLoan)}
                color="var(--warning)"
                note="Max ₹2L"
              />
            </div>

            {/* Quick scenarios */}
            <div className="card">
              <h3 style={{ fontSize:'14px', marginBottom:'12px', fontFamily:'Outfit,sans-serif' }}>⚡ Preset Scenarios</h3>
              {[
                { label:'Fresh Graduate',     income:600000,  invest:50000,  hra:0,      hl:0 },
                { label:'Mid-Career Salaried',income:1200000, invest:150000, hra:120000, hl:0 },
                { label:'Senior Professional',income:2000000, invest:150000, hra:0,      hl:200000 },
                { label:'High Earner',        income:3500000, invest:150000, hra:0,      hl:200000 },
              ].map(s => (
                <button key={s.label} onClick={() => { setIncome(s.income); setInvest(s.invest); setHra(s.hra); setHomeLoan(s.hl); }}
                  style={{
                    width:'100%', marginBottom:'7px', padding:'9px 14px', borderRadius:'8px',
                    border:'1px solid var(--border)', background:'var(--bg-elevated)',
                    cursor:'pointer', fontSize:'13px', fontFamily:'DM Sans,sans-serif',
                    color:'var(--text-primary)', textAlign:'left', transition:'all .2s',
                    display:'flex', justifyContent:'space-between', alignItems:'center'
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                >
                  <span>{s.label}</span>
                  <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>₹{s.income/100000}L</span>
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div>
            {/* Main result */}
            <div className="card" style={{ marginBottom:'14px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                <h3 style={{ fontSize:'15px', fontFamily:'Outfit,sans-serif' }}>📊 Results</h3>
                <div className={`badge badge-${bestRegime==='New'?'blue':'green'}`} style={{ fontSize:'13px', padding:'5px 12px' }}>
                  ✅ {bestRegime} Regime Wins
                </div>
              </div>

              <div className="regime-cards">
                {[
                  { label:'🔵 Old Regime', tax:result.oldRegime.tax, rate:result.oldRegime.rate, col:'var(--indigo)', regime:'old' },
                  { label:'🟢 New Regime', tax:result.newRegime.tax, rate:result.newRegime.rate, col:'var(--accent)', regime:'new' }
                ].map(r => {
                  const isWin = (saved > 0 && r.regime==='new') || (saved <= 0 && r.regime==='old');
                  return (
                    <div key={r.regime} className={`regime-card ${isWin?'winner':'loser'}`}>
                      <h4 style={{ fontSize:'13px', marginBottom:'8px' }}>{r.label}</h4>
                      <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'26px', fontWeight:800, color:r.col }}>
                        {fmt(r.tax)}
                      </div>
                      <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>
                        Effective rate: {r.rate}%
                      </div>
                      <div className="progress" style={{ marginTop:'10px' }}>
                        <div className="progress-fill" style={{ width:`${Math.min(r.rate*3,100)}%`, background:r.col }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Savings banner */}
              <div style={{
                marginTop:'14px', padding:'12px 16px', borderRadius:'10px',
                background:`rgba(${saved>0?'56,189,248':'52,211,153'},.08)`,
                border:`1px solid rgba(${saved>0?'56,189,248':'52,211,153'},.25)`,
                display:'flex', gap:'10px', alignItems:'center'
              }}>
                <span style={{ fontSize:'22px' }}>💰</span>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:700 }}>
                    {bestRegime} Regime saves <span style={{ color:'var(--success)' }}>{fmt(Math.abs(saved))}</span>
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px' }}>
                    Total deductions: {fmt(result.totalDeductions)} · Taxable (old): {fmt(result.oldRegime.taxable)}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart – tax vs income */}
            <div className="card">
              <h3 style={{ fontSize:'14px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>
                📉 Tax vs Income (with your deductions)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ right:10 }}>
                  <XAxis dataKey="income" tickFormatter={v=>`₹${v}L`} tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                  <YAxis tickFormatter={v=>`₹${(v/100000).toFixed(0)}L`} tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                  <Tooltip
                    formatter={(v,n)=>[fmt(v),n+' Regime']}
                    labelFormatter={v=>`Income: ₹${v}L`}
                    contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'12px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="Old" stroke="var(--indigo)" fill="rgba(99,102,241,.1)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="New" stroke="var(--accent)" fill="rgba(56,189,248,.1)"  strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <p style={{ fontSize:'11.5px', color:'var(--text-muted)', marginTop:'8px', textAlign:'center' }}>
                Lines show tax for each regime across income levels with your current deduction settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable slider component
function SliderField({ label, value, min, max, step, onChange, display, color, note }) {
  return (
    <div style={{ marginBottom:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
        <label className="form-label" style={{ margin:0 }}>{label}</label>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          {note && <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{note}</span>}
          <span style={{ fontSize:'14px', fontWeight:700, color, fontFamily:'JetBrains Mono,monospace' }}>{display}</span>
        </div>
      </div>
      <input
        type="range" className="slider" min={min} max={max} step={step}
        value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{ '--c':color }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10.5px', color:'var(--text-muted)', marginTop:'3px' }}>
        <span>{min >= 100000 ? `₹${min/100000}L` : fmt(min)}</span>
        <span>{max >= 100000 ? `₹${max/100000}L` : fmt(max)}</span>
      </div>
    </div>
  );
}
