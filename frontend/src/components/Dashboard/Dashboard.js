// src/components/Dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../utils/api';

const quickActions = [
  { icon:'🤖', label:'Chat with AI',    to:'/chat',       color:'rgba(56,189,248,.15)' },
  { icon:'📊', label:'Calculate Tax',    to:'/calculator', color:'rgba(99,102,241,.15)' },
  { icon:'📈', label:'What-if Simulation',to:'/simulation',color:'rgba(52,211,153,.15)' },
  { icon:'🎯', label:'Goal Planning',    to:'/goals',      color:'rgba(251,191,36,.15)' },
  { icon:'📂', label:'Upload Form 16',   to:'/documents',  color:'rgba(167,139,250,.15)'},
  { icon:'🤝', label:'Find a CA',        to:'/ca',         color:'rgba(248,113,113,.15)' },
];

const tips = [
  { icon:'💡', text:'No tax up to ₹7 Lakh in New Regime' },
  { icon:'📌', text:'New regime standard deduction raised to ₹75,000 in Budget 2024' },
  { icon:'🚀', text:'NPS gives extra ₹50K deduction under 80CCD(1B) – over 80C limit!' },
  { icon:'📅', text:'ITR filing deadline: July 31, 2025 for individuals' },
  { icon:'🏦', text:'ELSS has lowest lock-in (3 yrs) among 80C options with best returns' },
  { icon:'🏠', text:'Home loan interest up to ₹2L deductible under Section 24b' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [tipIdx,   setTipIdx]   = useState(0);

  useEffect(() => {
    chatAPI.sessions().then(r => setSessions(r.data.sessions || [])).catch(() => {});
    // Rotate tips
    const id = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 4000);
    return () => clearInterval(id);
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </div>
          <div className="page-sub">Welcome to your AI Tax Dashboard</div>
        </div>
        <button className="btn btn-accent btn-sm" onClick={() => nav('/chat')}>
          🤖 Ask TaxBot
        </button>
      </div>

      <div className="page-body">
        {/* Disclaimer */}
        <div className="disclaimer">
          ⚠️ This platform provides AI-powered tax guidance only. Always consult a qualified CA for final ITR filing.
        </div>

        {/* Rotating tip */}
        <div style={{
          padding:'14px 18px', borderRadius:'10px', marginBottom:'20px',
          background:'rgba(56,189,248,.06)', border:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:'12px', transition:'all .4s'
        }}>
          <span style={{ fontSize:'20px' }}>{tips[tipIdx].icon}</span>
          <p style={{ fontSize:'13.5px', color:'var(--text-secondary)', margin:0 }}>
            <strong style={{ color:'var(--accent)' }}>Tax Tip: </strong>
            {tips[tipIdx].text}
          </p>
        </div>

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom:'24px' }}>
          {[
            { icon:'💬', label:'Chat Sessions', val: sessions.length,  bg:'rgba(56,189,248,.12)' },
            { icon:'📅', label:'Days to Deadline', val:'97',           bg:'rgba(248,113,113,.12)' },
            { icon:'🏛️', label:'CAs Available',   val:'50+',           bg:'rgba(52,211,153,.12)' },
            { icon:'📋', label:'FY',               val:'2024-25',       bg:'rgba(167,139,250,.12)' },
          ].map(s => (
            <div className="stat" key={s.label}>
              <div className="stat-icon" style={{ background:s.bg }}>{s.icon}</div>
              <div>
                <div className="stat-val">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 style={{ fontSize:'16px', fontFamily:'Outfit,sans-serif', marginBottom:'14px' }}>
          ⚡ Quick Actions
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'28px' }}>
          {quickActions.map(a => (
            <button key={a.to} onClick={() => nav(a.to)} style={{
              display:'flex', flexDirection:'column', alignItems:'center',
              padding:'18px 14px', borderRadius:'12px', cursor:'pointer',
              border:'1px solid var(--border)', background:a.color,
              transition:'all .2s', gap:'8px'
            }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='none'}
            >
              <span style={{ fontSize:'24px' }}>{a.icon}</span>
              <span style={{ fontSize:'12.5px', fontWeight:600, color:'var(--text-primary)', textAlign:'center' }}>
                {a.label}
              </span>
            </button>
          ))}
        </div>

        {/* Recent chats */}
        {sessions.length > 0 && (
          <div>
            <h2 style={{ fontSize:'16px', fontFamily:'Outfit,sans-serif', marginBottom:'14px' }}>
              📜 Recent Conversations
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {sessions.slice(0,5).map(s => (
                <div key={s.sessionId} onClick={() => nav('/history')} style={{
                  padding:'12px 16px', borderRadius:'10px',
                  background:'var(--bg-card)', border:'1px solid var(--border)',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:'12px',
                  transition:'all .2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-strong)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                >
                  <span style={{ fontSize:'18px' }}>💬</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13.5px', fontWeight:500, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                      {s.title || 'Tax Consultation'}
                    </div>
                    <div style={{ fontSize:'11.5px', color:'var(--text-muted)', marginTop:'2px' }}>
                      {new Date(s.updatedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                    </div>
                  </div>
                  <span style={{ color:'var(--text-muted)', fontSize:'18px' }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official portals */}
        <div style={{ marginTop:'28px', padding:'18px', borderRadius:'12px', background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
          <h3 style={{ fontSize:'14px', marginBottom:'12px', fontFamily:'Outfit,sans-serif' }}>🔗 Official Government Portals</h3>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
            {[
              { href:'https://www.incometax.gov.in', label:'🏛️ Income Tax e-Filing', desc:'File ITR, check refund' },
              { href:'https://www.tdscpc.gov.in',    label:'📋 TRACES Portal',        desc:'Form 26AS, Form 16' },
              { href:'https://eportal.incometax.gov.in', label:'📱 IT e-Portal',     desc:'AIS, Tax payments' },
              { href:'https://enps.nsdl.com',        label:'🏦 NPS eNPS',            desc:'Open NPS account' },
            ].map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{
                padding:'10px 14px', borderRadius:'8px',
                border:'1px solid var(--border)', background:'var(--bg-card)',
                textDecoration:'none', transition:'all .2s', display:'flex', flexDirection:'column', gap:'2px'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
              >
                <span style={{ fontSize:'13px', fontWeight:600, color:'var(--accent)' }}>{l.label}</span>
                <span style={{ fontSize:'11.5px', color:'var(--text-muted)' }}>{l.desc}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
