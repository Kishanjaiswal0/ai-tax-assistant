// src/components/Documents/DocumentsPage.js
import React, { useState, useEffect, useRef } from 'react';
import { docAPI } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DocumentsPage() {
  const [checklist,  setChecklist]  = useState([]);
  const [extracted,  setExtracted]  = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [docType,    setDocType]    = useState('Form 16');
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    docAPI.checklist()
      .then(r => setChecklist(r.data.checklist || []))
      .catch(() => setChecklist([]));
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ['application/pdf','image/jpeg','image/png','image/jpg'];
    if (!allowed.includes(file.type)) { toast.error('Only PDF, JPG or PNG allowed'); return; }
    if (file.size > 5 * 1024 * 1024)  { toast.error('File size must be < 5MB'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('docType',  docType);
      const { data } = await docAPI.upload(fd);
      setExtracted(data);
      toast.success(`${docType} parsed successfully!`);
    } catch (err) {
      // Mock fallback when server is down
      setExtracted(getMockData(docType));
      toast('Using demo extraction (server offline)', { icon:'ℹ️' });
    } finally { setUploading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAutoFill = () => {
    if (!extracted?.extractedData?.autoFillData) return;
    const d = extracted.extractedData.autoFillData;
    toast.success('Data ready! Go to Tax Calculator to use it.');
    // Store in sessionStorage for Calculator to pick up
    sessionStorage.setItem('autofill', JSON.stringify(d));
    nav('/calculator');
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📂 Document Upload</div>
          <div className="page-sub">Upload Form 16 and tax documents · AI extracts key data</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', alignItems:'start' }}>

          {/* Upload zone */}
          <div>
            <div className="card" style={{ marginBottom:'16px' }}>
              <h3 style={{ fontSize:'15px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>📤 Upload Document</h3>

              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select className="form-select" value={docType} onChange={e=>setDocType(e.target.value)}>
                  <option>Form 16</option>
                  <option>Form 26AS</option>
                  <option>Investment Proof</option>
                  <option>Rent Receipt</option>
                  <option>Home Loan Statement</option>
                </select>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={onDrop}
                onClick={()=>fileRef.current?.click()}
                style={{
                  border:`2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
                  borderRadius:'12px', padding:'36px 24px', textAlign:'center',
                  cursor:'pointer', transition:'all .2s',
                  background: dragOver ? 'rgba(56,189,248,.06)' : 'var(--bg-elevated)',
                  marginBottom:'14px'
                }}
              >
                {uploading ? (
                  <div>
                    <div className="loader" style={{ margin:'0 auto 12px' }}/>
                    <p style={{ fontSize:'14px', color:'var(--text-secondary)' }}>Parsing document…</p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:'40px', marginBottom:'10px' }}>📄</div>
                    <p style={{ fontSize:'14px', fontWeight:600, marginBottom:'6px' }}>
                      Drop file here or click to browse
                    </p>
                    <p style={{ fontSize:'12.5px', color:'var(--text-muted)' }}>
                      Supported: PDF, JPG, PNG · Max 5MB
                    </p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />

              {/* Demo button */}
              <button className="btn btn-outline btn-sm" style={{ width:'100%' }} onClick={()=>{ setExtracted(getMockData(docType)); toast.success('Demo data loaded!'); }}>
                🎭 Load Demo Extraction
              </button>
            </div>

            {/* Document checklist */}
            <div className="card">
              <h3 style={{ fontSize:'15px', marginBottom:'14px', fontFamily:'Outfit,sans-serif' }}>✅ Document Checklist</h3>
              {checklist.length === 0 ? (
                <ChecklistFallback />
              ) : checklist.map(item => (
                <div key={item.id} style={{
                  display:'flex', gap:'10px', padding:'9px 0',
                  borderBottom:'1px solid var(--border)', alignItems:'flex-start'
                }}>
                  <span style={{ fontSize:'16px', marginTop:'1px' }}>{item.required ? '🔴' : '🟡'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500 }}>{item.doc}</div>
                    <div style={{ fontSize:'11.5px', color:'var(--text-muted)', marginTop:'2px' }}>{item.section}</div>
                  </div>
                  <span className={`badge badge-${item.required?'red':'yellow'}`}>
                    {item.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted data */}
          <div>
            {extracted ? (
              <div className="card slide-up">
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                  <span style={{ fontSize:'24px' }}>✅</span>
                  <div>
                    <h3 style={{ fontSize:'15px', fontFamily:'Outfit,sans-serif' }}>Extraction Complete</h3>
                    <p style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>
                      {extracted.filename || 'demo.pdf'} · {extracted.type}
                    </p>
                  </div>
                </div>

                <div style={{ padding:'10px 14px', borderRadius:'8px', background:'rgba(251,191,36,.07)', border:'1px solid rgba(251,191,36,.2)', fontSize:'12px', color:'var(--warning)', marginBottom:'16px' }}>
                  ⚠️ {extracted.note || 'Demo data for illustration purposes only.'}
                </div>

                {/* Key fields */}
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                  {Object.entries(extracted.extractedData || {})
                    .filter(([k]) => !['autoFillData'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'9px 12px', borderRadius:'8px',
                        background:'var(--bg-elevated)', border:'1px solid var(--border)'
                      }}>
                        <span style={{ fontSize:'12.5px', color:'var(--text-secondary)' }}>
                          {k.replace(/([A-Z])/g,' $1').trim()}
                        </span>
                        <span style={{ fontSize:'13px', fontWeight:600 }}>
                          {typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : String(v)}
                        </span>
                      </div>
                    ))}
                </div>

                {extracted.extractedData?.autoFillData && (
                  <button className="btn btn-accent" style={{ width:'100%' }} onClick={handleAutoFill}>
                    ⚡ Auto-fill Tax Calculator
                  </button>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign:'center', padding:'50px 24px' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px' }}>📋</div>
                <h3 style={{ fontSize:'16px', marginBottom:'8px', fontFamily:'Outfit,sans-serif' }}>Upload a Document</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'13.5px', lineHeight:1.6 }}>
                  Upload your Form 16 or other tax documents. The AI will extract key information like income, TDS, and deductions automatically.
                </p>
                <div style={{ marginTop:'20px', padding:'14px', borderRadius:'10px', background:'var(--bg-elevated)', textAlign:'left' }}>
                  <p style={{ fontSize:'13px', fontWeight:600, marginBottom:'8px' }}>Form 16 contains:</p>
                  {['Gross salary & allowances','TDS deducted by employer','Section 80C investments','Professional tax','Net taxable income'].map(i=>(
                    <p key={i} style={{ fontSize:'12.5px', color:'var(--text-secondary)', marginBottom:'4px' }}>✓ {i}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistFallback() {
  const items = [
    { doc:'Form 16 (Part A & B from employer)',           required:true  },
    { doc:'Form 26AS / Annual Information Statement',     required:true  },
    { doc:'80C Investment Proofs (PPF, ELSS, LIC)',       required:false },
    { doc:'Health Insurance Premium Receipt (80D)',        required:false },
    { doc:'Home Loan Annual Statement',                   required:false },
    { doc:'Rent Receipts (for HRA)',                      required:false },
    { doc:'Bank Interest Certificate',                    required:false },
    { doc:'NPS Transaction Statement',                    required:false },
    { doc:'Aadhaar + PAN copy',                           required:true  },
  ];
  return items.map((item,i) => (
    <div key={i} style={{ display:'flex', gap:'10px', padding:'9px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
      <span style={{ fontSize:'15px' }}>{item.required ? '🔴' : '🟡'}</span>
      <span style={{ fontSize:'13px', flex:1 }}>{item.doc}</span>
      <span className={`badge badge-${item.required?'red':'yellow'}`}>{item.required?'Required':'Optional'}</span>
    </div>
  ));
}

const getMockData = (docType) => ({
  filename:'demo_document.pdf', type:docType,
  note:'⚠️ This is simulated extraction for demo purposes only.',
  extractedData: docType === 'Form 16' ? {
    documentType:'Form 16 (Part A & B)', financialYear:'2024-25',
    employerName:'Infosys Limited', employerPAN:'AABCI1234C',
    employeePAN:'ABCDE1234F', grossSalary:1200000,
    standardDeduction:50000, professionalTax:2400,
    hraReceived:180000, tdsDeducted:72000,
    section80C:150000, section80D:25000,
    netTaxableIncome:792600,
    autoFillData:{ grossIncome:1200000, deductions:{ section80C:150000, section80D:25000, hra:120000, standardDeduction:50000 }, tdsDeducted:72000 }
  } : {
    documentType:docType, financialYear:'2024-25',
    panNumber:'ABCDE1234F', totalTaxPaid:75200, tdsDeducted:72000
  }
});
