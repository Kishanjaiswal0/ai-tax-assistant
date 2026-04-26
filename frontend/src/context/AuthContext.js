// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

// Configure axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(localStorage.getItem('tax_token'));
  const [loading, setLoading] = useState(true);
  const [theme,   setTheme]   = useState(localStorage.getItem('theme') || 'dark');
  const [lang,    setLang]    = useState(localStorage.getItem('lang')  || 'en');

  // Attach token to every request
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('tax_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('tax_token');
    }
  }, [token]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply language
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('lang', lang);
  }, [lang]);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await axios.get('/api/auth/me');
        setUser(data.user);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []); // eslint-disable-line

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (name, email, password, role, phone) => {
    const { data } = await axios.post('/api/auth/signup', { name, email, password, role, phone });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const { data } = await axios.put('/api/auth/profile', updates);
    setUser(data.user);
    return data.user;
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const toggleLang  = () => setLang(l => l === 'en' ? 'hi' : 'en');

  return (
    <AuthContext.Provider value={{
      user, token, loading, theme, lang,
      login, signup, logout, updateProfile, toggleTheme, toggleLang,
      isCA   : user?.role === 'ca',
      isUser : user?.role === 'user'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
