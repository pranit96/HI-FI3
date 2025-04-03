import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface User {
  id: number;
  email: string;
  name: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials extends LoginCredentials {
  name: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Query for current user
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      if (!token) return null;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        localStorage.removeItem('auth-token');
        return null;
      }

      return response.json();
    }
  });

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('auth-token', data.token);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('auth-token', data.token);

      await queryClient.setQueryData(['currentUser'], data.user);
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });

      toast({
        title: 'Success',
        description: 'Logged in successfully',
        variant: 'success',
      });

      navigate('/dashboard');
      return data.user;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast, navigate]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('auth-token', data.token);

      await queryClient.setQueryData(['currentUser'], data.user);
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });

      toast({
        title: 'Success',
        description: 'Account created successfully',
        variant: 'success',
      });

      navigate('/dashboard');
      return data.user;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast, navigate]);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('auth-token');
      queryClient.setQueryData(['currentUser'], null);
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });

      toast({
        title: 'Success',
        description: 'Logged out successfully',
        variant: 'success',
      });

      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [queryClient, toast, navigate]);

  return {
    user,
    isLoading: isLoading || isLoadingUser,
    isAuthenticated: !!user,
    login,
    register,
    logout
  };
}