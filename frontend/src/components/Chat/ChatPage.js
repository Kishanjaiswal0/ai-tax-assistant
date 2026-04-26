// src/components/Chat/ChatPage.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const WELCOME = `**Namaste! 🙏 I'm TaxBot, your AI Tax Assistant for India.**

I can help you with:
📊 **Tax Calculation** – Old vs New Regime (FY 2024-25)
💰 **Deductions** – 80C, 80D, NPS, HRA, Home Loan
📋 **ITR Filing** – Which form, deadlines, documents
🎯 **Tax Planning** – Strategies to save maximum tax
🤝 **CA Referral** – Connect with expert CAs

**To get started, tell me:**
- Your annual income (e.g., "I earn ₹12 lakh salary")
- Your age group and major investments

What's your tax question today?

⚠️ *This is AI guidance only. Consult a CA for final filing.*`;

const QUICK_QUESTIONS = [
  '🧮 Calculate tax for ₹10 lakh income',
  '📋 Explain Section 80C deductions',
  '⚖️ Compare Old vs New Tax Regime',
  '🏠 How does HRA exemption work?',
  '📅 What is the ITR filing deadline?',
  '🏦 Benefits of NPS for tax saving',
];

export default function ChatPage() {
  const { user, lang } = useAuth();
  const [messages,    setMessages]    = useState([{ role:'assistant', content:WELCOME }]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [sessionId,   setSessionId]   = useState(null);
  const [taxContext,  setTaxContext]   = useState({});
  const [listening,   setListening]   = useState(false);
  const [showQuick,   setShowQuick]   = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const recogRef  = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // Speech recognition
  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported in this browser'); return; }

    const recog = new SR();
    recog.lang           = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onstart  = () => setListening(true);
    recog.onend    = () => setListening(false);
    recog.onerror  = () => { setListening(false); toast.error('Voice recognition error'); };
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recog.start();
    recogRef.current = recog;
  }, [lang]);

  const stopVoice = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setShowQuick(false);
    setMessages(prev => [...prev, { role:'user', content:msg }]);
    setLoading(true);

    try {
      const { data } = await chatAPI.send({
        message    : msg,
        sessionId,
        history    : messages.slice(-10),
        taxContext,
        language   : lang
      });

      setMessages(prev => [...prev, { role:'assistant', content:data.response }]);
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to get response. Please try again.';
      setMessages(prev => [...prev, { role:'assistant', content:`❌ ${errMsg}` }]);
      toast.error('Chat failed');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const newChat = () => {
    setMessages([{ role:'assistant', content:WELCOME }]);
    setSessionId(null);
    setTaxContext({});
    setInput('');
    setShowQuick(true);
  };

  return (
    <div className="chat-shell">
      {/* Header */}
      <div className="page-header" style={{ flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{
            width:'36px', height:'36px', borderRadius:'10px',
            background:'var(--grad-accent)', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'18px'
          }}>🤖</div>
          <div>
            <div className="page-title">TaxBot AI</div>
            <div className="page-sub">
              <span style={{ color:'var(--success)' }}>●</span> Online · FY 2024-25
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={newChat}>🗑️ New Chat</button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            <div className="msg-avatar">
              {msg.role === 'user' ? user?.name?.[0]?.toUpperCase() || '👤' : '🤖'}
            </div>
            <div className={`msg-bubble ${msg.role}`}>
              {msg.role === 'assistant' ? (
                <div className="prose">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span style={{ fontSize:'13.5px' }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="msg-row assistant">
            <div className="msg-avatar">🤖</div>
            <div className="msg-bubble assistant">
              <div className="typing-dots"><span/><span/><span/></div>
            </div>
          </div>
        )}

        {/* Quick questions */}
        {showQuick && !loading && (
          <div style={{ marginTop:'8px' }}>
            <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'8px' }}>
              💡 Try asking:
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  padding:'7px 12px', borderRadius:'20px', border:'1px solid var(--border)',
                  background:'var(--bg-card)', cursor:'pointer', fontSize:'12.5px',
                  color:'var(--text-secondary)', transition:'all .2s', fontFamily:'DM Sans,sans-serif'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)'; }}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Tax Context Bar */}
      {(taxContext.income || taxContext.age) && (
        <div style={{
          padding:'8px 20px', background:'rgba(56,189,248,.06)',
          borderTop:'1px solid var(--border)', display:'flex', gap:'12px',
          fontSize:'12px', color:'var(--text-secondary)', alignItems:'center'
        }}>
          <span>📌 Context:</span>
          {taxContext.income && <span className="badge badge-blue">Income: ₹{(taxContext.income/100000).toFixed(1)}L</span>}
          {taxContext.age && <span className="badge badge-blue">Age: {taxContext.age}</span>}
          {taxContext.regime && <span className="badge badge-blue">Regime: {taxContext.regime}</span>}
          <button onClick={() => setTaxContext({})} style={{
            marginLeft:'auto', background:'transparent', border:'none',
            color:'var(--text-muted)', cursor:'pointer', fontSize:'11px'
          }}>✕ Clear</button>
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-bar">
        <div style={{ position:'relative', flex:1 }}>
          <textarea
            ref={inputRef}
            className="chat-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={lang === 'hi' ? 'टैक्स के बारे में पूछें…' : 'Ask about taxes, deductions, ITR filing… (Enter to send)'}
            rows={1}
            disabled={loading}
          />
        </div>

        {/* Voice button */}
        <button
          onClick={listening ? stopVoice : startVoice}
          style={{
            width:'40px', height:'40px', borderRadius:'10px', border:'none',
            cursor:'pointer', fontSize:'18px', transition:'all .2s',
            background: listening ? 'rgba(248,113,113,.2)' : 'var(--bg-card)',
            color: listening ? 'var(--danger)' : 'var(--text-secondary)',
            animation: listening ? 'pulse 1s infinite' : 'none',
            flexShrink:0
          }}
          title={listening ? 'Stop recording' : 'Voice input'}
        >
          {listening ? '⏹' : '🎤'}
        </button>

        {/* Send button */}
        <button className="chat-send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          ➤
        </button>
      </div>

      {/* Bottom disclaimer */}
      <div style={{
        padding:'6px 20px', fontSize:'11px', color:'var(--text-muted)',
        background:'var(--bg-surface)', textAlign:'center', borderTop:'1px solid var(--border)'
      }}>
        ⚠️ AI guidance only · Not a substitute for professional CA advice
        &nbsp;|&nbsp;
        <a href="https://www.incometax.gov.in" target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', textDecoration:'none' }}>
          incometax.gov.in
        </a>
      </div>
    </div>
  );
}
