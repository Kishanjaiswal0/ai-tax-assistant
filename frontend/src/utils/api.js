// src/utils/api.js - Centralised Axios helpers
import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000' });

// Auto-attach token from localStorage on each request
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('tax_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Auth
export const authAPI = {
  signup  : (d) => api.post('/api/auth/signup', d),
  login   : (d) => api.post('/api/auth/login',  d),
  me      : ()  => api.get('/api/auth/me'),
  profile : (d) => api.put('/api/auth/profile', d),
};

// Chat
export const chatAPI = {
  send       : (d)   => api.post('/api/chat/message', d),
  sessions   : ()    => api.get('/api/chat/sessions'),
  session    : (sid) => api.get(`/api/chat/session/${sid}`),
  delSession : (sid) => api.delete(`/api/chat/session/${sid}`),
};

// Tax
export const taxAPI = {
  calculate    : (d) => api.post('/api/tax/calculate', d),
  simulate     : (d) => api.post('/api/tax/simulate',  d),
  goalStrategy : (d) => api.post('/api/tax/goal-strategy', d),
  optimize     : (d) => api.post('/api/tax/optimize',  d),
};

// CA
export const caAPI = {
  list        : (p) => api.get('/api/ca', { params: p }),
  get         : (id)=> api.get(`/api/ca/${id}`),
  myProfile   : ()  => api.get('/api/ca/my-profile'),
  saveProfile : (d) => api.post('/api/ca/profile', d),
  toggleAvail : (d) => api.patch('/api/ca/availability', d),
};

// Consultations
export const consultAPI = {
  book       : (d)  => api.post('/api/consultations', d),
  mine       : ()   => api.get('/api/consultations/my'),
  caRequests : ()   => api.get('/api/consultations/ca-requests'),
  status     : (id,d)=> api.patch(`/api/consultations/${id}/status`, d),
  message    : (id,d)=> api.post(`/api/consultations/${id}/message`, d),
};

// Documents
export const docAPI = {
  upload    : (fd) => api.post('/api/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }}),
  checklist : ()   => api.get('/api/documents/checklist'),
};

export default api;
