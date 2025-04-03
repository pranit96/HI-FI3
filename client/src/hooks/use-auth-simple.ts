import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface User {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
  createdAt: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  currency?: string;
  monthlySalary?: number | null;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Query to fetch current user
  const { data: user, isLoading: isLoadingUser } = useQuery<User | null>({
    queryKey: ['currentUser'],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) return null;

        const response = await fetch("/api/auth/me", {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: "include"
        });

        if (response.status === 401) {
          localStorage.removeItem('auth-token');
          return null;
        }

        if (!response.ok) throw new Error('Failed to fetch user');

        return await response.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    }
  });

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const { token, user } = await response.json();
      localStorage.setItem('auth-token', token);

      // Update query client configuration
      queryClient.setDefaultOptions({
        queries: {
          queryFn: async ({ queryKey }) => {
            const currentToken = localStorage.getItem('auth-token');
            const response = await fetch(queryKey[0] as string, {
              headers: {
                'Authorization': `Bearer ${currentToken}`,
                'auth-token': currentToken || ''
              },
              credentials: 'include'
            });

            if (response.status === 401) {
              localStorage.removeItem('auth-token');
              queryClient.setQueryData(['currentUser'], null);
              throw new Error('Session expired');
            }

            if (!response.ok) throw new Error('Request failed');
            return response.json();
          }
        }
      });

      queryClient.setQueryData(['currentUser'], user);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
        variant: "success",
      });

      navigate('/dashboard');
      return user;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast, navigate]);

  // Register function
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const { token, user } = await response.json();
      localStorage.setItem('auth-token', token);
      queryClient.setQueryData(['currentUser'], user);
      
      toast({
        title: "Registration successful",
        description: "Welcome!",
        variant: "success",
      });

      navigate('/dashboard');
      return user;
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast, navigate]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      
      localStorage.removeItem('auth-token');
      queryClient.clear();
      queryClient.setQueryData(['currentUser'], null);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
        variant: "success",
      });
      
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
