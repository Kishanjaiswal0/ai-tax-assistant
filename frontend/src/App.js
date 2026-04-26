// src/App.js - Root component with routing
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages / components
import AuthPage        from './components/Auth/AuthPage';
import Layout          from './components/Layout/Layout';
import Dashboard       from './components/Dashboard/Dashboard';
import ChatPage        from './components/Chat/ChatPage';
import CalculatorPage  from './components/Calculator/CalculatorPage';
import SimulationPage  from './components/Simulation/SimulationPage';
import GoalsPage       from './components/Goals/GoalsPage';
import DocumentsPage   from './components/Documents/DocumentsPage';
import CAPage          from './components/CA/CAPage';
import CAProfilePage   from './components/CA/CAProfilePage';
import HistoryPage     from './components/History/HistoryPage';
import './App.css';

// Route guard – requires login
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loader"/></div>;
  return user ? children : <Navigate to="/auth" replace />;
};

// Route guard – requires CA role
const CARoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loader"/></div>;
  if (!user)          return <Navigate to="/auth" replace />;
  if (user.role!=='ca')return <Navigate to="/"   replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index                    element={<Dashboard />} />
        <Route path="chat"              element={<ChatPage />} />
        <Route path="calculator"        element={<CalculatorPage />} />
        <Route path="simulation"        element={<SimulationPage />} />
        <Route path="goals"             element={<GoalsPage />} />
        <Route path="documents"         element={<DocumentsPage />} />
        <Route path="ca"                element={<CAPage />} />
        <Route path="ca/profile"        element={<CARoute><CAProfilePage /></CARoute>} />
        <Route path="history"           element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration : 3500,
            style    : { background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' },
            success  : { iconTheme: { primary:'#10b981', secondary:'#fff' }},
            error    : { iconTheme: { primary:'#ef4444', secondary:'#fff' }}
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
