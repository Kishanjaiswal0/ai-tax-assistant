// src/components/Auth/AuthPage.js
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [tab,  setTab]  = useState('login');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'' });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back! 🎉');
      } else {
        await signup(form.name, form.email, form.password, role, form.phone);
        toast.success('Account created! 🚀');
      }
      nav('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg-base)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', position:'relative', overflow:'hidden'
    }}>
      {/* Background orbs */}
      <div style={{
        position:'absolute', top:'-20%', right:'-10%',
        width:'500px', height:'500px', borderRadius:'50%',
        background:'radial-gradient(circle,rgba(56,189,248,.08) 0%,transparent 70%)',
        pointerEvents:'none'
      }}/>
      <div style={{
        position:'absolute', bottom:'-20%', left:'-10%',
        width:'600px', height:'600px', borderRadius:'50%',
        background:'radial-gradient(circle,rgba(99,102,241,.06) 0%,transparent 70%)',
        pointerEvents:'none'
      }}/>

      <div className="fade-in" style={{ width:'100%', maxWidth:'440px', position:'relative', zIndex:1 }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{
            width:'56px', height:'56px', borderRadius:'16px',
            background:'var(--grad-accent)', display:'flex',
            alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', fontSize:'26px',
            boxShadow:'var(--shadow-glow)'
          }}>🧾</div>
          <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:'26px', fontWeight:800 }}>
            AI Tax<span style={{ background:'var(--grad-accent)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}> Assistant</span>
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginTop:'6px' }}>
            Smart Tax Filing for India
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:'28px' }}>
          {/* Tabs */}
          <div style={{
            display:'flex', background:'var(--bg-elevated)', borderRadius:'10px',
            padding:'4px', marginBottom:'22px'
          }}>
            {['login','signup'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex:1, padding:'8px', borderRadius:'8px', border:'none',
                cursor:'pointer', fontSize:'13.5px', fontWeight:600,
                fontFamily:'DM Sans,sans-serif', transition:'all .2s',
                background: tab===t ? 'var(--grad-primary)' : 'transparent',
                color      : tab===t ? '#fff'               : 'var(--text-secondary)',
                boxShadow  : tab===t ? '0 2px 10px rgba(8,145,178,.3)' : 'none'
              }}>{t === 'login' ? 'Login' : 'Sign Up'}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="Rahul Sharma" value={form.name} onChange={set('name')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (optional)</label>
                  <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
                </div>
                {/* Role selector */}
                <div className="form-group">
                  <label className="form-label">I am a…</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                    {[
                      { key:'user', emoji:'👤', label:'Taxpayer', desc:'File ITR, get tax advice' },
                      { key:'ca',   emoji:'🏛️', label:'CA / Expert', desc:'Manage client consultations' }
                    ].map(r => (
                      <div key={r.key} onClick={() => setRole(r.key)} style={{
                        padding:'12px', borderRadius:'10px', cursor:'pointer',
                        border:`2px solid ${role===r.key ? 'var(--accent)' : 'var(--border)'}`,
                        background: role===r.key ? 'rgba(56,189,248,.08)' : 'var(--bg-input)',
                        transition:'all .2s', textAlign:'center'
                      }}>
                        <div style={{ fontSize:'22px', marginBottom:'4px' }}>{r.emoji}</div>
                        <div style={{ fontSize:'13px', fontWeight:700 }}>{r.label}</div>
                        <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
            </div>

            <button className="btn btn-accent" style={{ width:'100%', marginTop:'6px', padding:'12px' }} disabled={loading}>
              {loading ? <span className="loader" style={{ width:18, height:18, borderWidth:2 }}/> : null}
              {tab === 'login' ? '🔐 Login' : '🚀 Create Account'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop:'16px', padding:'10px 14px', borderRadius:'8px',
            background:'rgba(56,189,248,.06)', border:'1px solid var(--border)',
            fontSize:'12px', color:'var(--text-muted)'
          }}>
            <strong style={{ color:'var(--accent)' }}>Demo accounts:</strong><br/>
            User: user@demo.com / demo123<br/>
            CA: ca@demo.com / demo123
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ textAlign:'center', fontSize:'11.5px', color:'var(--text-muted)', marginTop:'16px', lineHeight:1.5 }}>
          ⚠️ AI guidance only. Consult a CA for final tax filing.<br/>
          By signing up you agree to our Terms of Service.
        </p>

        {/* Official links */}
        <div style={{ display:'flex', gap:'16px', justifyContent:'center', marginTop:'12px' }}>
          <a href="https://www.incometax.gov.in" target="_blank" rel="noopener noreferrer" style={{ fontSize:'12px', color:'var(--accent)', textDecoration:'none' }}>
            🏛️ Income Tax India
          </a>
          <a href="https://www.tdscpc.gov.in" target="_blank" rel="noopener noreferrer" style={{ fontSize:'12px', color:'var(--accent)', textDecoration:'none' }}>
            📋 TRACES Portal
          </a>
        </div>
      </div>
    </div>
  );
}
