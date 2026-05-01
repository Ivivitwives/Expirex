import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('expirex_token'));

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('expirex_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setToken(storedToken);
    } catch (error) {
      localStorage.removeItem('expirex_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('expirex_token', newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  const signup = async (email, password, username) => {
    const response = await api.post('/auth/signup', { email, password, username });
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('expirex_token', newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('expirex_token');
    setToken(null);
    setUser(null);
  };

  const updateSettings = async (settings) => {
    const response = await api.patch('/auth/settings', settings);
    setUser(response.data.user);
    return response.data.user;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateSettings,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;