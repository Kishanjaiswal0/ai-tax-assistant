// src/components/Chat/ChatPage.js - Improved Chat Interface with History Sidebar
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { detectLanguage } from '../../utils/languageDetection';
import { speak, stopSpeech, isTTSSupported, resolveVoiceLocale, getSpeechRecognitionLocale } from '../../utils/textToSpeech';
import toast from 'react-hot-toast';

const WELCOME = `**Namaste! 🙏 I'm TaxBot, your AI Tax Assistant for India.**

I can help you with:
📊 **Tax Calculation** – Old vs New Regime
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
  const { user, voiceEnabled, responseLanguage, toggleVoice, setRespLang, theme, setCustomTheme } = useAuth();
  const [messages,       setMessages]       = useState([{ role:'assistant', content:WELCOME }]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [sessionId,      setSessionId]      = useState(null);
  const [taxContext,     setTaxContext]     = useState({});
  const [isSpeaking,     setIsSpeaking]     = useState(false);
  const [listening,      setListening]      = useState(false);
  const [showQuick,      setShowQuick]      = useState(true);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [chatHistory,    setChatHistory]    = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDeleteAll,  setShowDeleteAll]  = useState(false);
  const [hoveredChat,    setHoveredChat]    = useState(null);
  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const recogRef     = useRef(null);
  const fileInputRef = useRef(null);

  // Document context state
  const [docUploading, setDocUploading] = useState(false);
  const [uploadedDoc,  setUploadedDoc]  = useState(null); // { filename, uploadedAt }

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior:'smooth' }); 
  }, [messages]);

  // Cleanup: Stop voice when exiting chatbot screen
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeech();
      }
    };
  }, [isSpeaking]);

  // Load chat history from backend
  const loadChatHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await chatAPI.sessions();
      setChatHistory(data.sessions || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load a specific chat session
  const loadChatSession = async (sid) => {
    try {
      const { data } = await chatAPI.session(sid);
      if (data.chat) {
        setMessages(data.chat.messages || [{ role:'assistant', content:WELCOME }]);
        setSessionId(sid);
        setShowQuick(false);
        setTaxContext(data.chat.taxContext || {});
      }
    } catch (err) {
      toast.error('Failed to load chat session');
    }
  };

  // Delete a single chat session with confirmation
  const deleteChatSession = async (e, sid) => {
    e.stopPropagation();
    if (window.confirm('🗑️ Delete this chat? This action cannot be undone.')) {
      try {
        await chatAPI.delSession(sid);
        setChatHistory(prev => prev.filter(s => s.sessionId !== sid));
        if (sessionId === sid) {
          newChat();
        }
        toast.success('Chat deleted');
      } catch (err) {
        toast.error('Failed to delete chat');
      }
    }
  };

  // Delete all chats with confirmation
  const deleteAllChats = async () => {
    try {
      let deleted = 0;
      for (const session of chatHistory) {
        try {
          await chatAPI.delSession(session.sessionId);
          deleted++;
        } catch (e) {
          // Continue deleting others if one fails
        }
      }
      setChatHistory([]);
      newChat();
      toast.success(`Deleted ${deleted} chat${deleted !== 1 ? 's' : ''}`);
      setShowDeleteAll(false);
    } catch (err) {
      toast.error('Failed to delete all chats');
    }
  };

  // Speech recognition
  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported in this browser'); return; }

    const recog = new SR();
    recog.lang           = getSpeechRecognitionLocale(responseLanguage);
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
  }, [responseLanguage]);

  const stopVoice = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  // ── Document upload helpers ───────────────────────────────────
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      const { data } = await chatAPI.uploadDoc(fd);
      setUploadedDoc({ filename: data.filename, uploadedAt: new Date().toISOString() });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `📎 **Document uploaded:** \`${data.filename}\`\n\n${data.message}\n\n> **Preview:** ${data.preview}`
      }]);
      toast.success(`"${data.filename}" ready for Q&A!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Document upload failed');
    } finally {
      setDocUploading(false);
    }
  };

  const clearUploadedDoc = async () => {
    try {
      await chatAPI.clearDoc();
      setUploadedDoc(null);
      toast.success('Document context cleared');
    } catch (err) {
      toast.error('Failed to clear document');
    }
  };
  // ─────────────────────────────────────────────────────────────

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    // Detect input language
    const detected = detectLanguage(msg);
  

    // Determine response language
    let respLang = responseLanguage;
    if (responseLanguage === 'auto') {
      respLang = detected;
    }

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
        language   : respLang
      });

      const response = data.response;
      setMessages(prev => [...prev, { role:'assistant', content:response }]);
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      loadChatHistory(); // Refresh history after new message

      // Text-to-speech if enabled
      if (voiceEnabled && isTTSSupported()) {
        setIsSpeaking(true);
        const cleanText = response
          .replace(/\*\*/g, '')
          .replace(/[*_`]/g, '')
          .replace(/\n/g, ' ')
          .slice(0, 500); // Limit length for TTS
        
        speak(cleanText, resolveVoiceLocale(respLang), () => {
          setIsSpeaking(false);
        });
      }
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
    loadChatHistory();
  };

  return (
    <div style={{ display:'flex', height:'100%', background:'var(--bg-base)' }}>
      {/* ═══════════════════════════════ SIDEBAR ═══════════════════════════════ */}
      <div style={{
        width: sidebarOpen ? '280px' : '0',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        boxShadow: sidebarOpen ? 'var(--shadow-md)' : 'none',
        zIndex: 100
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
            💬 Chats
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '16px',
              padding: '4px 8px'
            }}
            title="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={newChat}
          style={{
            margin: '8px',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '12.5px',
            fontWeight: '500',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          ➕ New Chat
        </button>

        {/* Chat History List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {historyLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}>
              Loading...
            </div>
          ) : chatHistory.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              lineHeight: '1.5'
            }}>
              No chats yet. <br/> Start a conversation to see history here.
            </div>
          ) : (
            chatHistory.map(chat => (
              <div
                key={chat.sessionId}
                onMouseEnter={() => setHoveredChat(chat.sessionId)}
                onMouseLeave={() => setHoveredChat(null)}
                onClick={() => loadChatSession(chat.sessionId)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: sessionId === chat.sessionId ? 'var(--bg-elevated)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderLeft: sessionId === chat.sessionId ? '3px solid var(--accent)' : '3px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    fontSize: '12.5px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'ellipsis',
                    textOverflow: 'ellipsis'
                  }}>
                    {chat.title}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '2px'
                  }}>
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                
                {(hoveredChat === chat.sessionId || sessionId === chat.sessionId) && (
                  <button
                    onClick={(e) => deleteChatSession(e, chat.sessionId)}
                    style={{
                      background: 'rgba(248,113,113,0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      marginLeft: '8px',
                      fontSize: '12px',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(248,113,113,0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(248,113,113,0.1)';
                    }}
                    title="Delete chat"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Delete All Button */}
        {chatHistory.length > 0 && (
          <div style={{
            padding: '12px 8px',
            borderTop: '1px solid var(--border)',
            marginTop: 'auto'
          }}>
            <button
              onClick={() => setShowDeleteAll(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(248,113,113,0.2)',
                background: 'transparent',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.1)';
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)';
              }}
              title="Delete all chats permanently"
            >
              🗑️ Clear All Chats
            </button>
          </div>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAll && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            maxWidth: '400px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              ⚠️ Delete All Chats?
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              This will permanently delete all {chatHistory.length} chat{chatHistory.length !== 1 ? 's' : ''} and cannot be undone.
            </div>
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowDeleteAll(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={deleteAllChats}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--danger)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ MAIN CHAT AREA ═══════════════════════════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-base)'
      }}>
        {/* Header */}
        <div className="page-header" style={{ flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '18px',
                  padding: '4px 8px'
                }}
                title="Open sidebar"
              >
                ☰
              </button>
            )}
            <div style={{
              width:'36px', height:'36px', borderRadius:'10px',
              background:'var(--grad-accent)', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:'18px'
            }}>🤖</div>
            <div>
              <div className="page-title">TaxBot AI</div>
              <div className="page-sub">
                <span style={{ color:'var(--success)' }}>●</span> Online
              </div>
            </div>
          </div>

          {/* Controls: Voice, Language, Theme */}
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            {/* Voice Toggle */}
            {isTTSSupported() && (
              <button
                onClick={() => {
                  toggleVoice();
                  // Stop any ongoing speech immediately when toggling OFF
                  if (voiceEnabled && isSpeaking) {
                    stopSpeech();
                    setIsSpeaking(false);
                  }
                }}
                title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${voiceEnabled ? 'var(--accent)' : 'var(--border)'}`,
                  background: voiceEnabled ? 'rgba(56,189,248,0.1)' : 'transparent',
                  color: voiceEnabled ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(56,189,248,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = voiceEnabled ? 'rgba(56,189,248,0.1)' : 'transparent';
                }}
              >
                {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
              </button>
            )}

            {/* Language Selector */}
            <select
              value={responseLanguage}
              onChange={(e) => setRespLang(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <option value="auto">🌐 Auto</option>
              <option value="en">🇺🇸 English</option>
              <option value="hi">🇮🇳 हिंदी</option>
              <option value="bhojpuri">🎭 भोजपुरी</option>
              <option value="punjabi">🟡 ਪੰਜਾਬੀ</option>
            </select>

            {/* Theme Selector */}
            <select
              value={theme}
              onChange={(e) => setCustomTheme(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <option value="dark">🌙 Dark</option>
              <option value="light">☀️ Light</option>
              <option value="gradient">🌊 Gradient</option>
              <option value="neon">⚡ Neon</option>
            </select>
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

        {/* ── Document Context Status Bar ───────────────────────── */}
        {uploadedDoc && (
          <div style={{
            padding:'7px 20px',
            background:'rgba(74,222,128,.07)',
            borderTop:'1px solid rgba(74,222,128,.25)',
            display:'flex', gap:'10px', alignItems:'center',
            fontSize:'12px', color:'var(--text-secondary)'
          }}>
            <span style={{ color:'var(--success)' }}>📄</span>
            <span style={{ fontWeight:500, color:'var(--text-primary)', maxWidth:'260px',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {uploadedDoc.filename}
            </span>
            <span style={{ color:'var(--text-muted)', fontSize:'11px' }}>
              · Active document context
            </span>
            <button
              onClick={clearUploadedDoc}
              title="Remove document context"
              style={{
                marginLeft:'auto', background:'transparent', border:'none',
                color:'var(--danger)', cursor:'pointer', fontSize:'11px',
                fontWeight:500, padding:'2px 6px', borderRadius:'4px',
                transition:'all .15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,.1)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >✕ Remove</button>
          </div>
        )}

        {/* Input bar */}
        <div className="chat-input-bar">

          {/* Hidden file input for document upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.jpg,.jpeg,.png"
            style={{ display:'none' }}
            onChange={handleDocUpload}
          />

          {/* 📎 Document upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={docUploading || loading}
            title={uploadedDoc ? `Document: ${uploadedDoc.filename} (click to replace)` : 'Upload document (PDF/TXT/Image)'}
            style={{
              width:'40px', height:'40px', borderRadius:'10px', border:'none',
              cursor: docUploading ? 'wait' : 'pointer',
              fontSize:'18px', transition:'all .2s', flexShrink:0,
              background: uploadedDoc
                ? 'rgba(74,222,128,.15)'
                : docUploading ? 'rgba(56,189,248,.1)' : 'var(--bg-card)',
              color: uploadedDoc ? 'var(--success)'
                : docUploading ? 'var(--accent)' : 'var(--text-secondary)',
              animation: docUploading ? 'pulse 1s infinite' : 'none'
            }}
            onMouseEnter={e => { if (!docUploading) e.currentTarget.style.background='rgba(56,189,248,.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = uploadedDoc ? 'rgba(74,222,128,.15)' : 'var(--bg-card)'; }}
          >
            {docUploading ? '⏳' : uploadedDoc ? '📄' : '📎'}
          </button>

          <div style={{ position:'relative', flex:1 }}>
            <textarea
              ref={inputRef}
              className="chat-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                responseLanguage === 'hi'       ? 'टैक्स के बारे में पूछें…' :
                responseLanguage === 'bhojpuri' ? 'Tax ke baare mein puchen… (Bhojpuri)' :
                responseLanguage === 'punjabi'  ? 'ਟੈਕਸ ਬਾਰੇ ਪੁੱਛੋ… (Punjabi)' :
                uploadedDoc ? 'Ask about your uploaded document or any tax question…' :
                'Ask about taxes, deductions, ITR filing… (Enter to send)'
              }
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
            title={listening ? 'Stop recording' : `Voice input (${
              responseLanguage === 'hi' ? 'हिंदी' :
              responseLanguage === 'bhojpuri' ? 'भोजपुरी' :
              responseLanguage === 'punjabi'  ? 'ਪੰਜਾਬੀ' :
              'English'
            })`}
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
    </div>
  );
}
