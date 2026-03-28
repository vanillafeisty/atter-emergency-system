import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API;

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('atter_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('atter_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('atter_token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t); setUser(u);
    return u;
  };

  const register = async (data) => {
    const res = await axios.post('/auth/register', data);
    const { token: t, user: u } = res.data;
    localStorage.setItem('atter_token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t); setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('atter_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null); setUser(null);
  };

  const updateLocation = async (lat, lng) => {
    try { await axios.patch('/user/location', { lat, lng }); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateLocation }}>
      {children}
    </AuthContext.Provider>
  );
}
