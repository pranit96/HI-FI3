// src/hooks/use-auth.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { apiRequest } from '@/lib/queryClient';

type User = {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const navigate = useNavigate();

  // Add getAccessToken function
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!token) return null;

      // Check token expiration
      const decoded = jwtDecode<{ exp: number }>(token);
      if (decoded.exp * 1000 < Date.now()) {
        if (!refreshToken) {
          logout();
          return null;
        }
        
        // Refresh token if expired
        const newToken = await refreshToken(refreshToken);
        return newToken;
      }

      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }, []);

  const refreshToken = useCallback(async (refreshToken: string): Promise<string> => {
    try {
      const response = await apiRequest('POST', '/auth/refresh', {
        refreshToken,
      });

      const { accessToken, expiresIn } = await response.json();
      localStorage.setItem('accessToken', accessToken);
      
      return accessToken;
    } catch (error) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user } = await response.json();
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setAuthState({
        user,
        loading: false,
        error: null,
      });
      
      return user;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: 'Invalid email or password',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuthState({
      user: null,
      loading: false,
      error: null,
    });
    navigate('/login');
  }, [navigate]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          logout();
          return;
        }

        const response = await apiRequest('GET', '/auth/me');
        const user = await response.json();
        
        setAuthState({
          user,
          loading: false,
          error: null,
        });
      } catch (error) {
        logout();
      }
    };

    initializeAuth();
  }, [getAccessToken, logout]);

  return {
    ...authState,
    getAccessToken, // Expose the function
    login,
    logout,
  };
};
