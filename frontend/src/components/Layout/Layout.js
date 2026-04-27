// src/components/Layout/Layout.js
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../utils/i18n';

const NAV_USER = [
  { to:'/',           icon:'🏠', key:'dashboard'   },
  { to:'/chat',       icon:'🤖', key:'chatbot'     },
  { to:'/calculator', icon:'📊', key:'calculator'  },
  { to:'/simulation', icon:'📈', key:'simulation'  },
  { to:'/goals',      icon:'🎯', key:'goalPlanning'},
  { to:'/documents',  icon:'📂', key:'documents'   },
  { to:'/ca',         icon:'🤝', key:'caConsult'   },
  { to:'/history',    icon:'📜', key:'chatHistory' },
];

const NAV_CA = [
  { to:'/',           icon:'🏠', key:'dashboard'   },
  { to:'/ca/profile', icon:'🏛️', key:'caConsult', label:'My CA Profile' },
  { to:'/ca',         icon:'👥', key:'chatbot',   label:'Browse CAs'   },
  { to:'/history',    icon:'📜', key:'chatHistory' },
];

export default function Layout() {
  const { user, logout, toggleTheme, toggleLang, theme, lang, isCA } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const nav = useNavigate();
  const navItems = isCA ? NAV_CA : NAV_USER;

  const handleLogout = () => { logout(); nav('/auth'); };

  const Sidebar = () => (
    <aside className={`sidebar ${sideOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-orb">🧾</div>
        <div className="brand-name">
          AI Tax Assistant
          <span>{isCA ? 'CA Portal' : 'Taxpayer'}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-group"><span className="nav-group-label">Navigation</span></div>
        {navItems.map(item => (
          <NavLink
            key={item.to + item.key}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => setSideOpen(false)}
          >
            <span>{item.icon}</span>
            <span>{item.label || t(item.key, lang)}</span>
          </NavLink>
        ))}

        <div className="nav-group" style={{ marginTop:'12px' }}>
          <span className="nav-group-label">Quick Links</span>
        </div>
        <a href="https://www.incometax.gov.in" target="_blank" rel="noopener noreferrer" className="nav-link">
          <span>🏛️</span><span style={{ fontSize:'12.5px' }}>Income Tax India</span>
        </a>
        <a href="https://www.tdscpc.gov.in" target="_blank" rel="noopener noreferrer" className="nav-link">
          <span>📋</span><span style={{ fontSize:'12.5px' }}>TRACES Portal</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* User info */}
        <div style={{
          display:'flex', alignItems:'center', gap:'10px',
          padding:'10px 12px', borderRadius:'10px',
          background:'var(--bg-elevated)', marginBottom:'10px'
        }}>
          <div style={{
            width:'34px', height:'34px', borderRadius:'50%',
            background:'var(--grad-accent)', display:'flex',
            alignItems:'center', justifyContent:'center',
            fontSize:'15px', flexShrink:0
          }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:'13px', fontWeight:600, truncate:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>
              {isCA ? '🏛️ CA' : '👤 User'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title="Toggle theme" style={{ flex:1 }}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={toggleLang} title="Toggle language" style={{ flex:1 }}>
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇺🇸 ENG'}
          </button>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ width:'100%', marginTop:'8px' }}>
          🚪 {t('logout', lang)}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      <Sidebar />
      {/* Mobile backdrop */}
      {sideOpen && (
        <div onClick={() => setSideOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:199
        }}/>
      )}

      <main className="main-area">
        {/* Mobile topbar */}
        <div style={{
          display:'none', padding:'12px 16px',
          background:'var(--bg-surface)', borderBottom:'1px solid var(--border)',
          alignItems:'center', gap:'12px',
          position:'sticky', top:0, zIndex:100
        }} className="mobile-bar">
          <button className="hamburger" onClick={() => setSideOpen(o => !o)}>
            ☰
          </button>
          <span style={{ fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:'15px' }}>
            🧾 AI Tax Assistant
          </span>
        </div>

        <Outlet />
      </main>

      <style>{`.mobile-bar { display: flex !important; } @media(min-width:769px) { .mobile-bar { display: none !important; } }`}</style>
    </div>
  );
}
