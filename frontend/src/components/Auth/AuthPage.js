import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HelpCircle, Landmark, FileText, User, Briefcase, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('login');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showDemo, setShowDemo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      minHeight: '100vh',
      background: '#0B0B13', // Deep dark blue background
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Mesh Gradient Background */}
      <motion.div
        animate={{
          x: [0, 50, 0, -50, 0],
          y: [0, 30, -30, 20, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <motion.div
        animate={{
          x: [0, -40, 20, -20, 0],
          y: [0, -40, 30, -10, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', bottom: '-15%', left: '-5%',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 1 }}
      >
        {/* Header with 3D Hero Asset */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '100px', height: '100px',
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <img src="/taxbot-ag.png" alt="Anti-Gravity TaxBot" style={{ width: '150%', height: '150%', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(56,189,248,0.2))' }} />
          </motion.div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            AI Tax<span style={{ background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> Assistant</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginTop: '8px', fontWeight: 400 }}>
            Smart Tax Filing for India
          </p>
        </div>

        {/* Glassmorphism Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '40px', // 2.5rem internal padding
          boxShadow: '0 20px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
            padding: '4px', marginBottom: '28px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.3s ease',
                background: tab === t ? 'var(--grad-primary)' : 'transparent',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: tab === t ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
              }}>{t === 'login' ? 'Login' : 'Sign Up'}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#E0E0E0', marginBottom: '8px' }}>Full Name</label>
                  <input className="premium-input" placeholder="Rahul Sharma" value={form.name} onChange={set('name')} required />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#E0E0E0', marginBottom: '8px' }}>Phone (optional)</label>
                  <input className="premium-input" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
                </div>
                {/* Role selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#E0E0E0', marginBottom: '8px' }}>I am a…</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { key: 'user', icon: <User size={20} />, label: 'Taxpayer' },
                      { key: 'ca', icon: <Briefcase size={20} />, label: 'CA / Expert' }
                    ].map(r => (
                      <div key={r.key} onClick={() => setRole(r.key)} style={{
                        padding: '14px 12px', borderRadius: '12px', cursor: 'pointer',
                        border: `1px solid ${role === r.key ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        background: role === r.key ? 'rgba(56,189,248,0.08)' : '#1E1E2E',
                        transition: 'all 0.2s ease', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                      }}>
                        <div style={{ color: role === r.key ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}>
                          {r.icon}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: role === r.key ? '#fff' : 'rgba(255,255,255,0.6)' }}>{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#E0E0E0', marginBottom: '8px' }}>Email Address</label>
              <input className="premium-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            
            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, color: '#E0E0E0', marginBottom: '8px' }}>
                Password
                {tab === 'login' && <span style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: '12px' }}>Forgot?</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="premium-input" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min 6 characters" 
                  value={form.password} 
                  onChange={set('password')} 
                  required 
                  minLength={6} 
                  style={{ paddingRight: '40px' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                    padding: 0, display: 'flex'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              className="btn btn-accent" 
              style={{ 
                width: '100%', padding: '14px', borderRadius: '12px', 
                fontSize: '15px', fontWeight: 600,
                boxShadow: '0 4px 14px rgba(56,189,248,0.3)',
                position: 'relative', overflow: 'hidden'
              }} 
              disabled={loading}
            >
              {loading ? <span className="loader" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (tab === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Toggleable Demo Accounts Help */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button 
              type="button" 
              onClick={() => setShowDemo(!showDemo)}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              <HelpCircle size={14} /> Need test credentials?
            </button>
            
            {showDemo && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '12px', padding: '12px', borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'left'
                }}
              >
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>Demo Accounts:</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>User: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>user@demo.com</code></span>
                  <span>Pass: <code>demo123</code></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CA: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>ca@demo.com</code></span>
                  <span>Pass: <code>demo123</code></span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Enhancement */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block', padding: '6px 12px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
            fontSize: '11px', color: 'rgba(255,255,255,0.4)'
          }}>
            By signing up you agree to our <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Terms of Service</span>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '16px' }}>
            <a href="https://www.incometax.gov.in" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <Landmark size={14} /> Income Tax Dept
            </a>
            <a href="https://www.tdscpc.gov.in" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <FileText size={14} /> TRACES
            </a>
          </div>
        </div>
      </motion.div>

      {/* Global styles for premium inputs injected directly for this page */}
      <style>{`
        .premium-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          background: #1E1E2E;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          transition: all 0.3s ease;
          outline: none;
        }
        .premium-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .premium-input:focus {
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
          background: #232336;
        }
      `}</style>
    </div>
  );
}
