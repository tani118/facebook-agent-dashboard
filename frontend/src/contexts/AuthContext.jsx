import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Set base URL for API calls
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Add ngrok header for all requests when using ngrok URL
if (axios.defaults.baseURL.includes('ngrok-free.app')) {
  axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set token in axios headers when token changes
  useEffect(() => {
    console.log('Token changed:', token ? 'Token set' : 'Token cleared');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
      localStorage.setItem('token', token);
      console.log('Token stored in localStorage and axios headers');
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      console.log('Token removed from localStorage and axios headers');
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Auth check - token:', token);
      if (token) {
        try {
          console.log('Making auth check request to:', axios.defaults.baseURL + '/auth/me');
          const response = await axios.get('/auth/me');
          console.log('Auth check response:', response.data);
          if (response.data.success) {
            setUser(response.data.data.user);
            console.log('User authenticated:', response.data.data.user);
          } else {
            console.log('Auth check failed - invalid token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          setToken(null);
        }
      } else {
        console.log('No token found');
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Login attempt:', { email, baseURL: axios.defaults.baseURL });
      const response = await axios.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      if (response.data.success) {
        const { token, user } = response.data.data;
        setToken(token);
        setUser(user);
        console.log('Login successful, token and user set:', { token: token?.substring(0, 20) + '...', user });
        return { success: true };
      }
      console.log('Login failed - response not successful');
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const response = await axios.post('/auth/signup', { name, email, password });
      if (response.data.success) {
        setToken(response.data.data.token);
        setUser(response.data.data.user);
        return { success: true };
      }
      return { success: false, error: response.data.message || 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      if (error.response?.data?.errors) {
        // Handle validation errors
        const errorMessage = error.response.data.errors.map(err => err.message).join(', ');
        return { success: false, error: errorMessage };
      }
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Signup failed' 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!token && !!user
  };

  console.log('AuthContext value:', { 
    hasToken: !!token, 
    hasUser: !!user, 
    isAuthenticated: !!token && !!user,
    loading 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
