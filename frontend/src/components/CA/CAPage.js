// src/components/CA/CAPage.js  - Browse CAs & book consultations
import React, { useState, useEffect } from 'react';
import { caAPI, consultAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const SPECS = ['ITR Filing','GST','Corporate Tax','International Taxation','Tax Planning','Audit','Investment Advisory','Startup Taxation','NRI Taxation'];

const SAMPLE_CAS = [
  { _id:'s1', name:'CA Rajesh Kumar',  city:'Mumbai',    state:'Maharashtra', experience:12, rating:4.8, specializations:['ITR Filing','Tax Planning','GST'],                        about:'Senior CA with 12+ years. Former Big4 employee. Expert in salaried and HNI taxation.',      consultationFee:2000, totalConsultations:450, isAvailable:true, verified:true,  languages:['English','Hindi','Marathi'] },
  { _id:'s2', name:'CA Priya Sharma',  city:'Delhi',     state:'Delhi',       experience:8,  rating:4.9, specializations:['International Taxation','Startup Taxation','ITR Filing'],  about:'NRI taxation, FEMA compliance and startup equity specialist. Featured in Economic Times.',  consultationFee:3000, totalConsultations:280, isAvailable:true, verified:true,  languages:['English','Hindi'] },
  { _id:'s3', name:'CA Amit Patel',    city:'Ahmedabad', state:'Gujarat',     experience:15, rating:4.7, specializations:['Corporate Tax','Audit','GST'],                            about:'Expert in corporate taxation and statutory audits with Big4 background (EY, Deloitte).',    consultationFee:2500, totalConsultations:620, isAvailable:true, verified:true,  languages:['English','Hindi','Gujarati'] },
  { _id:'s4', name:'CA Sneha Reddy',   city:'Hyderabad', state:'Telangana',   experience:5,  rating:4.6, specializations:['Investment Advisory','Tax Planning','ITR Filing'],         about:'Young, tech-savvy CA specializing in investment-linked tax planning for millennials.',       consultationFee:1500, totalConsultations:180, isAvailable:true, verified:false, languages:['English','Hindi','Telugu'] },
  { _id:'s5', name:'CA Vikram Mehta',  city:'Pune',      state:'Maharashtra', experience:10, rating:4.7, specializations:['GST','Corporate Tax','Audit'],                             about:'GST practitioner and corporate tax advisor for SMEs and startups.',                          consultationFee:2000, totalConsultations:340, isAvailable:true, verified:true,  languages:['English','Hindi','Marathi'] },
  { _id:'s6', name:'CA Nisha Jain',    city:'Bengaluru', state:'Karnataka',   experience:7,  rating:4.8, specializations:['Startup Taxation','Investment Advisory','ITR Filing'],     about:'ESOP taxation, startup funding rounds, and tech professional tax planning specialist.',      consultationFee:2200, totalConsultations:210, isAvailable:true, verified:true,  languages:['English','Hindi','Kannada'] },
];

export default function CAPage() {
  const [cas,       setCas]       = useState([]);
  const [filter,    setFilter]    = useState({ city:'', spec:'', minExp:'' });
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [myReqs,    setMyReqs]    = useState([]);
  const [tab,       setTab]       = useState('browse');
  const [form,      setForm]      = useState({ topic:'ITR Filing', description:'', preferredDate:'', preferredTime:'09:00', income:'', complexity:'moderate' });
  const [submitting,setSubmitting]= useState(false);

  useEffect(() => {
    caAPI.list(filter)
      .then(r => setCas(r.data.cas?.length ? r.data.cas : SAMPLE_CAS))
      .catch(()  => setCas(SAMPLE_CAS));

    consultAPI.mine()
      .then(r => setMyReqs(r.data.consultations || []))
      .catch(()  => {});
  }, []); // eslint-disable-line

  const applyFilter = async () => {
    try {
      const params = {};
      if (filter.city) params.city = filter.city;
      if (filter.spec) params.specialization = filter.spec;
      if (filter.minExp) params.minExp = filter.minExp;
      const { data } = await caAPI.list(params);
      setCas(data.cas?.length ? data.cas : SAMPLE_CAS.filter(c =>
        (!filter.city || c.city.toLowerCase().includes(filter.city.toLowerCase())) &&
        (!filter.spec || c.specializations.includes(filter.spec)) &&
        (!filter.minExp || c.experience >= Number(filter.minExp))
      ));
    } catch {
      setCas(SAMPLE_CAS);
    }
  };

  const handleBook = async () => {
    if (!form.topic) { toast.error('Topic is required'); return; }
    setSubmitting(true);
    try {
      await consultAPI.book({
        caProfileId : selected._id,
        caId        : selected.userId || selected._id,
        ...form,
        income      : Number(form.income) || undefined
      });
      toast.success(`Consultation request sent to ${selected.name}!`);
      setShowModal(false);
      setMyReqs(prev => [{ caName:selected.name, topic:form.topic, status:'pending', createdAt:new Date() }, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally { setSubmitting(false); }
  };

  const stars = (r) => '★'.repeat(Math.floor(r)) + '☆'.repeat(5 - Math.floor(r));

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">🤝 CA Consultation</div>
          <div className="page-sub">Connect with expert Chartered Accountants</div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {['browse','my-requests'].map(t=>(
            <button key={t} className={`btn btn-sm ${tab===t?'btn-accent':'btn-ghost'}`} onClick={()=>setTab(t)}>
              {t==='browse' ? '🔍 Find CA' : `📋 My Requests (${myReqs.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {tab === 'browse' && (
          <>
            {/* Filters */}
            <div className="card" style={{ marginBottom:'18px' }}>
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'flex-end' }}>
                <div style={{ flex:'1 1 130px' }}>
                  <label className="form-label">City</label>
                  <input className="form-input" placeholder="e.g. Mumbai" value={filter.city} onChange={e=>setFilter(f=>({...f,city:e.target.value}))} />
                </div>
                <div style={{ flex:'1 1 180px' }}>
                  <label className="form-label">Specialization</label>
                  <select className="form-select" value={filter.spec} onChange={e=>setFilter(f=>({...f,spec:e.target.value}))}>
                    <option value="">All Specializations</option>
                    {SPECS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex:'1 1 120px' }}>
                  <label className="form-label">Min Experience</label>
                  <select className="form-select" value={filter.minExp} onChange={e=>setFilter(f=>({...f,minExp:e.target.value}))}>
                    <option value="">Any</option>
                    <option value="3">3+ years</option>
                    <option value="5">5+ years</option>
                    <option value="10">10+ years</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={applyFilter}>🔍 Filter</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setFilter({city:'',spec:'',minExp:''});setCas(SAMPLE_CAS);}}>✕ Reset</button>
              </div>
            </div>

            {/* CA Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px' }}>
              {cas.map(ca => (
                <div key={ca._id} className="card" style={{ transition:'all .2s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border-strong)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                >
                  {/* CA header */}
                  <div style={{ display:'flex', gap:'12px', marginBottom:'12px' }}>
                    <div style={{
                      width:'48px', height:'48px', borderRadius:'50%', flexShrink:0,
                      background:'var(--grad-accent)', display:'flex',
                      alignItems:'center', justifyContent:'center',
                      fontSize:'20px', fontWeight:700, color:'#fff'
                    }}>
                      {ca.name.split(' ').slice(1).join(' ')[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'14.5px', fontWeight:700 }}>{ca.name}</span>
                        {ca.verified && <span title="Verified" style={{ color:'var(--accent)', fontSize:'14px' }}>✓</span>}
                      </div>
                      <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>
                        📍 {ca.city}, {ca.state} · {ca.experience} yrs exp
                      </div>
                      <div className="stars" style={{ fontSize:'12px' }}>{stars(ca.rating)}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'var(--accent)' }}>₹{ca.consultationFee?.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize:'10.5px', color:'var(--text-muted)' }}>per session</div>
                    </div>
                  </div>

                  {/* About */}
                  <p style={{ fontSize:'12.5px', color:'var(--text-secondary)', marginBottom:'12px', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {ca.about}
                  </p>

                  {/* Specializations */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'12px' }}>
                    {(ca.specializations || []).slice(0,3).map(s=>(
                      <span key={s} className="badge badge-blue" style={{ fontSize:'10.5px' }}>{s}</span>
                    ))}
                    {ca.specializations?.length > 3 && <span className="badge badge-purple" style={{ fontSize:'10.5px' }}>+{ca.specializations.length-3}</span>}
                  </div>

                  {/* Stats row */}
                  <div style={{ display:'flex', gap:'12px', marginBottom:'14px', fontSize:'12px', color:'var(--text-muted)' }}>
                    <span>💼 {ca.totalConsultations}+ clients</span>
                    <span>🗣️ {(ca.languages||[]).join(', ')}</span>
                  </div>

                  <button
                    className={`btn ${ca.isAvailable?'btn-accent':'btn-ghost'} btn-sm`}
                    style={{ width:'100%' }}
                    disabled={!ca.isAvailable}
                    onClick={()=>{ setSelected(ca); setShowModal(true); }}
                  >
                    {ca.isAvailable ? '📅 Book Consultation' : '⏸ Unavailable'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'my-requests' && (
          <div>
            {myReqs.length === 0 ? (
              <div className="card" style={{ textAlign:'center', padding:'50px' }}>
                <div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div>
                <h3 style={{ fontSize:'16px', marginBottom:'8px' }}>No consultation requests yet</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'13.5px' }}>Browse CAs and book a consultation to get started.</p>
                <button className="btn btn-accent btn-sm" style={{ marginTop:'16px' }} onClick={()=>setTab('browse')}>🔍 Browse CAs</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {myReqs.map((req,i) => (
                  <div key={i} className="card">
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <span style={{ fontSize:'28px' }}>👨‍💼</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:600 }}>{req.caName}</div>
                        <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Topic: {req.topic}</div>
                        <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'3px' }}>
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'Just now'}
                        </div>
                      </div>
                      <span className={`badge badge-${req.status==='accepted'?'green':req.status==='rejected'?'red':req.status==='completed'?'purple':'yellow'}`}>
                        {req.status || 'pending'}
                      </span>
                    </div>
                    {req.description && <p style={{ fontSize:'12.5px', color:'var(--text-muted)', marginTop:'10px', paddingTop:'10px', borderTop:'1px solid var(--border)' }}>{req.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking modal */}
      {showModal && selected && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">
              📅 Book with {selected.name}
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>

            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'16px' }}>
              <span className="badge badge-blue">₹{selected.consultationFee?.toLocaleString('en-IN')}/session</span>
              <span className="badge badge-green">{selected.experience} yrs experience</span>
            </div>

            {[
              { label:'Consultation Topic', key:'topic', type:'select', options:['ITR Filing','Tax Planning','GST','Capital Gains','NRI Taxation','Startup Taxation','General Query'] },
              { label:'Describe Your Issue', key:'description', type:'textarea', placeholder:'e.g. I have salary income + freelance income and capital gains from mutual funds…' },
              { label:'Annual Income (₹)', key:'income', type:'number', placeholder:'e.g. 1200000' },
              { label:'Complexity', key:'complexity', type:'select', options:['simple','moderate','complex'] },
              { label:'Preferred Date', key:'preferredDate', type:'date' },
              { label:'Preferred Time', key:'preferredTime', type:'time' },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="form-select" value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>
                    {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="form-textarea" placeholder={f.placeholder} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} rows={3}/>
                ) : (
                  <input className="form-input" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
                )}
              </div>
            ))}

            <div style={{ display:'flex', gap:'10px', marginTop:'6px' }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-accent" style={{ flex:2 }} onClick={handleBook} disabled={submitting}>
                {submitting ? '⏳ Sending…' : '📤 Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
