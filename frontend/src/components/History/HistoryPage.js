// src/components/History/HistoryPage.js
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [active,   setActive]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    chatAPI.sessions()
      .then(r => setSessions(r.data.sessions || []))
      .catch(()  => setSessions([]))
      .finally(()=> setLoading(false));
  }, []);

  const loadSession = async (sid) => {
    setActive(sid);
    try {
      const { data } = await chatAPI.session(sid);
      setMessages(data.chat?.messages || []);
    } catch { toast.error('Failed to load session'); }
  };

  const deleteSession = async (sid) => {
    try {
      await chatAPI.delSession(sid);
      setSessions(prev => prev.filter(s => s.sessionId !== sid));
      if (active === sid) { setActive(null); setMessages([]); }
      toast.success('Session deleted');
    } catch { toast.error('Delete failed'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="loader"/>
    </div>
  );

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📜 Chat History</div>
          <div className="page-sub">{sessions.length} conversation{sessions.length !== 1 ? 's' : ''} saved</div>
        </div>
        <button className="btn btn-accent btn-sm" onClick={() => nav('/chat')}>
          ✏️ New Chat
        </button>
      </div>

      <div className="page-body">
        {sessions.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'60px 24px' }}>
            <div style={{ fontSize:'56px', marginBottom:'16px' }}>💬</div>
            <h3 style={{ fontSize:'18px', marginBottom:'10px', fontFamily:'Outfit,sans-serif' }}>No Chat History Yet</h3>
            <p style={{ color:'var(--text-secondary)', fontSize:'14px', marginBottom:'20px' }}>
              Start a conversation with TaxBot to get AI-powered tax guidance.
            </p>
            <button className="btn btn-accent" onClick={() => nav('/chat')}>
              🤖 Start Chatting
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'20px', alignItems:'start' }}>
            {/* Sessions list */}
            <div className="card" style={{ padding:'8px' }}>
              <p style={{ fontSize:'12px', color:'var(--text-muted)', padding:'8px 10px 10px', textTransform:'uppercase', letterSpacing:'.8px', fontWeight:700 }}>
                Sessions
              </p>
              {sessions.map(s => (
                <div key={s.sessionId} onClick={()=>loadSession(s.sessionId)} style={{
                  padding:'10px 12px', borderRadius:'8px', cursor:'pointer',
                  marginBottom:'4px', transition:'all .2s',
                  background: active===s.sessionId ? 'rgba(56,189,248,.1)' : 'transparent',
                  borderLeft: active===s.sessionId ? '3px solid var(--accent)' : '3px solid transparent',
                  display:'flex', alignItems:'center', gap:'10px'
                }}>
                  <span style={{ fontSize:'18px' }}>💬</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:active===s.sessionId?600:400, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', color: active===s.sessionId?'var(--accent)':'var(--text-primary)' }}>
                      {s.title || 'Tax Consultation'}
                    </div>
                    <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>
                      {new Date(s.updatedAt).toLocaleDateString('en-IN',{ day:'numeric', month:'short', year:'numeric' })}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSession(s.sessionId); }}
                    style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'14px', padding:'2px', borderRadius:'4px', opacity:0, transition:'opacity .2s' }}
                    title="Delete"
                    onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                    onMouseLeave={e=>e.currentTarget.style.opacity='0'}
                  >🗑️</button>
                </div>
              ))}
            </div>

            {/* Messages panel */}
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              {active ? (
                messages.length > 0 ? (
                  <div>
                    <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontSize:'18px' }}>💬</span>
                      <span style={{ fontSize:'14px', fontWeight:600 }}>{sessions.find(s=>s.sessionId===active)?.title || 'Chat Session'}</span>
                    </div>
                    <div style={{ maxHeight:'calc(100vh - 280px)', overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                      {messages.map((msg, i) => (
                        <div key={i} style={{ display:'flex', gap:'10px', flexDirection: msg.role==='user'?'row-reverse':'row' }}>
                          <div style={{
                            width:'30px', height:'30px', borderRadius:'50%', flexShrink:0,
                            background: msg.role==='user' ? 'var(--grad-primary)' : 'var(--bg-hover)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px'
                          }}>
                            {msg.role==='user' ? '👤' : '🤖'}
                          </div>
                          <div style={{
                            maxWidth:'70%', padding:'10px 14px', borderRadius:'12px', fontSize:'13.5px',
                            background: msg.role==='user' ? 'var(--grad-primary)' : 'var(--bg-elevated)',
                            border: msg.role==='assistant' ? '1px solid var(--border)' : 'none',
                            color: msg.role==='user' ? '#fff' : 'var(--text-primary)',
                            lineHeight:1.6
                          }}>
                            {msg.role==='assistant' ? (
                              <div className="prose"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                            ) : msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
                      <button className="btn btn-accent btn-sm" onClick={() => nav('/chat')}>
                        Continue this conversation →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)' }}>
                    <div className="loader" style={{ margin:'0 auto 12px' }}/>
                    Loading messages…
                  </div>
                )
              ) : (
                <div style={{ padding:'60px 24px', textAlign:'center', color:'var(--text-muted)' }}>
                  <div style={{ fontSize:'40px', marginBottom:'12px' }}>👈</div>
                  <p style={{ fontSize:'14px' }}>Select a session to view the conversation</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
