// src/components/CA/CAProfilePage.js
import React, { useState, useEffect } from 'react';
import { caAPI, consultAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SPECS = ['ITR Filing','GST','Corporate Tax','International Taxation','Tax Planning','Audit','Investment Advisory','Startup Taxation','NRI Taxation'];
const LANGS = ['English','Hindi','Marathi','Gujarati','Telugu','Tamil','Kannada','Bengali','Punjabi'];

export default function CAProfilePage() {
  const { user } = useAuth();
  const [profile,   setProfile]   = useState(null);
  const [requests,  setRequests]  = useState([]);
  const [tab,       setTab]       = useState('profile');
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState({
    registrationNumber:'', experience:'', city:'', state:'', about:'',
    consultationFee:'', phone:'',
    specializations:[], languages:[]
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      caAPI.myProfile().catch(()=>({ data:{ profile:null }})),
      consultAPI.caRequests().catch(()=>({ data:{ consultations:[] }}))
    ]).then(([pRes, rRes]) => {
      const p = pRes.data.profile;
      if (p) {
        setProfile(p);
        setForm({
          registrationNumber : p.registrationNumber || '',
          experience         : p.experience || '',
          city               : p.city       || '',
          state              : p.state      || '',
          about              : p.about      || '',
          consultationFee    : p.consultationFee || '',
          phone              : p.phone      || '',
          specializations    : p.specializations || [],
          languages          : p.languages  || [],
        });
      }
      setRequests(rRes.data.consultations || []);
    }).finally(() => setLoading(false));
  }, []);

  const toggleArr = (arr, val, key) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x=>x!==val) : [...f[key], val]
    }));
  };

  const handleSave = async () => {
    if (!form.registrationNumber || !form.experience) {
      toast.error('Registration number and experience are required'); return;
    }
    setSaving(true);
    try {
      const { data } = await caAPI.saveProfile(form);
      setProfile(data.profile);
      toast.success('Profile saved! ✅');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await consultAPI.status(id, { status });
      setRequests(prev => prev.map(r => r._id===id ? {...r, status} : r));
      toast.success(`Request ${status}`);
    } catch { toast.error('Update failed'); }
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div className="loader"/></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">🏛️ CA Dashboard</div>
          <div className="page-sub">Manage your profile and consultation requests</div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {['profile','requests'].map(t=>(
            <button key={t} className={`btn btn-sm ${tab===t?'btn-accent':'btn-ghost'}`} onClick={()=>setTab(t)}>
              {t==='profile' ? '👤 My Profile' : `📋 Requests (${requests.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {tab === 'profile' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>

            {/* Left column */}
            <div>
              <div className="card" style={{ marginBottom:'16px' }}>
                <h3 style={{ fontSize:'15px', marginBottom:'16px', fontFamily:'Outfit,sans-serif' }}>📋 Basic Information</h3>
                {[
                  { label:'CA Registration Number', key:'registrationNumber', placeholder:'FCA/123456 or ACA/789012' },
                  { label:'Phone Number',            key:'phone',             placeholder:'+91 98765 43210' },
                  { label:'City',                    key:'city',              placeholder:'e.g. Mumbai' },
                  { label:'State',                   key:'state',             placeholder:'e.g. Maharashtra' },
                  { label:'Consultation Fee (₹)',    key:'consultationFee',   placeholder:'e.g. 2000', type:'number' },
                ].map(f=>(
                  <div className="form-group" key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type={f.type||'text'} placeholder={f.placeholder} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input className="form-input" type="number" min={0} max={60} value={form.experience} onChange={e=>setForm(p=>({...p,experience:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">About (max 600 chars)</label>
                  <textarea className="form-textarea" rows={3} maxLength={600} placeholder="Tell clients about your expertise and approach…" value={form.about} onChange={e=>setForm(p=>({...p,about:e.target.value}))} />
                  <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{form.about.length}/600</span>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              <div className="card" style={{ marginBottom:'16px' }}>
                <h3 style={{ fontSize:'15px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>🎯 Specializations</h3>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {SPECS.map(s=>(
                    <button key={s} onClick={()=>toggleArr(form.specializations,s,'specializations')} style={{
                      padding:'6px 13px', borderRadius:'20px', border:'none', cursor:'pointer',
                      fontSize:'12.5px', fontFamily:'DM Sans,sans-serif', transition:'all .2s',
                      background: form.specializations.includes(s) ? 'rgba(56,189,248,.2)' : 'var(--bg-elevated)',
                      color: form.specializations.includes(s) ? 'var(--accent)' : 'var(--text-secondary)',
                      outline: form.specializations.includes(s) ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginBottom:'16px' }}>
                <h3 style={{ fontSize:'15px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>🗣️ Languages</h3>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {LANGS.map(l=>(
                    <button key={l} onClick={()=>toggleArr(form.languages,l,'languages')} style={{
                      padding:'6px 13px', borderRadius:'20px', border:'none', cursor:'pointer',
                      fontSize:'12.5px', fontFamily:'DM Sans,sans-serif', transition:'all .2s',
                      background: form.languages.includes(l) ? 'rgba(167,139,250,.2)' : 'var(--bg-elevated)',
                      color: form.languages.includes(l) ? 'var(--purple)' : 'var(--text-secondary)',
                      outline: form.languages.includes(l) ? '1px solid var(--purple)' : '1px solid var(--border)',
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <button className="btn btn-accent" style={{ width:'100%', padding:'12px' }} onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving…' : '💾 Save Profile'}
              </button>

              {/* Profile preview */}
              {profile && (
                <div className="card" style={{ marginTop:'16px' }}>
                  <h3 style={{ fontSize:'13px', marginBottom:'10px', color:'var(--text-secondary)' }}>PROFILE PREVIEW</h3>
                  <div style={{ display:'flex', gap:'10px', marginBottom:'10px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'var(--grad-accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', color:'#fff', fontWeight:700, flexShrink:0 }}>
                      {user?.name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight:700 }}>{user?.name}</div>
                      <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>📍 {profile.city}, {profile.state} · {profile.experience} yrs</div>
                      <div style={{ fontSize:'12px', color:'var(--warning)' }}>{'★'.repeat(Math.floor(profile.rating||4.5))}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {(profile.specializations||[]).map(s=><span key={s} className="badge badge-blue" style={{ fontSize:'10.5px' }}>{s}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'requests' && (
          <div>
            {requests.length === 0 ? (
              <div className="card" style={{ textAlign:'center', padding:'50px' }}>
                <div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div>
                <h3 style={{ fontSize:'16px', marginBottom:'8px' }}>No consultation requests yet</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'13.5px' }}>Complete your profile so clients can find and book you.</p>
              </div>
            ) : requests.map(req => (
              <div key={req._id} className="card" style={{ marginBottom:'12px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--bg-hover)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>👤</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                      <span style={{ fontSize:'14.5px', fontWeight:600 }}>{req.userName}</span>
                      <span className={`badge badge-${req.status==='accepted'?'green':req.status==='rejected'?'red':req.status==='completed'?'purple':'yellow'}`}>{req.status}</span>
                    </div>
                    <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>📋 {req.topic}</div>
                    {req.description && <div style={{ fontSize:'12.5px', color:'var(--text-muted)', marginTop:'4px' }}>{req.description}</div>}
                    <div style={{ display:'flex', gap:'12px', marginTop:'8px', fontSize:'12px', color:'var(--text-muted)' }}>
                      {req.income && <span>💰 Income: ₹{Number(req.income).toLocaleString('en-IN')}</span>}
                      {req.complexity && <span>🔀 {req.complexity}</span>}
                      {req.preferredDate && <span>📅 {new Date(req.preferredDate).toLocaleDateString('en-IN')}</span>}
                      {req.preferredTime && <span>⏰ {req.preferredTime}</span>}
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
                      <button className="btn btn-success btn-sm" onClick={()=>updateStatus(req._id,'accepted')}>✓ Accept</button>
                      <button className="btn btn-danger btn-sm"  onClick={()=>updateStatus(req._id,'rejected')}>✕ Decline</button>
                    </div>
                  )}
                  {req.status === 'accepted' && (
                    <button className="btn btn-ghost btn-sm" onClick={()=>updateStatus(req._id,'completed')}>✅ Mark Done</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
