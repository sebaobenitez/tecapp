import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setToken = (t) => {
    if (t) {
      localStorage.setItem('pos_token', t);
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      setTokenState(t);
    } else {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_codigo_negocio');
      delete axios.defaults.headers.common['Authorization'];
      setTokenState(null);
    }
  };

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    const handler = () => { setToken(null); setUser(null); };
    window.addEventListener('pos:logout', handler);
    return () => window.removeEventListener('pos:logout', handler);
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('pos_token');
    if (!t) { setLoading(false); return; }
    setToken(t);
    axios.get('/api/auth/me')
      .then(r => setUser(r.data))
      .catch(() => { setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password, codigo_negocio) => {
    const r = await axios.post('/api/auth/login', { username, password, codigo_negocio: codigo_negocio || undefined });
    setToken(r.data.token);
    setUser(r.data.user);
    if (codigo_negocio) localStorage.setItem('pos_codigo_negocio', codigo_negocio.toUpperCase());
    return r.data.user;
  };

  const can = (roles) => user && roles.includes(user.rol);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
