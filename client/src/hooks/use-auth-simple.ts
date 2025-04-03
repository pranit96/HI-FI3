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
  const { data: user, isLoading: isLoadingUser, isError } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    meta: {
      suppressErrorToast: true
    },
    // This will allow 401 responses to be treated as a successful
    // response with null data, not as errors
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: token ? {
          'Authorization': `Bearer ${token}`,
          'auth-token': token
        } : {}
      });
      
      if (response.status === 401) {
        localStorage.removeItem('auth-token');
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    }
  });

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      console.log("Attempting login with:", credentials.email);
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
      });
      
      console.log("Login response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Get response data
      const responseData = await response.json();
      console.log("Login successful, response received:", responseData);
      
      // Store token
      const token = responseData.token;
      localStorage.setItem('auth-token', token);
      
      // Update query cache with user data
      await queryClient.setQueryData(['/api/auth/me'], responseData.user);

      // Configure global fetch defaults
      const defaultInit: RequestInit = {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'auth-token': token
        }
      };

      // Set new defaults for all queries
      queryClient.setDefaultOptions({
        queries: {
          queryFn: async ({ queryKey }) => {
            const response = await fetch(queryKey[0] as string, {
              ...defaultInit,
              method: 'GET'
            });
            
            if (response.status === 401) {
              localStorage.removeItem('auth-token');
              queryClient.setQueryData(['/api/auth/me'], null);
              return null;
            }
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response.json();
          },
          retry: 1
        },
        mutations: {
          mutationFn: async ({ endpoint, method = 'POST', data }) => {
            const response = await fetch(endpoint, {
              ...defaultInit,
              method,
              headers: {
                ...defaultInit.headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response.json();
          }
        }
      });

      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Login successful",
        description: "Welcome back to FinSavvy!",
        variant: "success",
      });
      
      return responseData.user;
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast]);

  // Register function
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);
      console.log("Attempting registration with:", credentials.email);
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
      });
      
      console.log("Registration response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Get user data from response
      const userData = await response.json();
      console.log("Registration successful, user data received:", userData);
      
      // Update query cache
      await queryClient.setQueryData(['/api/auth/me'], userData);
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Registration successful",
        description: "Welcome to FinSavvy!",
        variant: "success",
      });
      
      return userData;
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      // Reset query cache
      queryClient.setQueryData(['/api/auth/me'], null);
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
        variant: "success",
      });
      
      // Navigate to login
      navigate("/login");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, toast, navigate]);

  return {
    user: user as User | null,
    isLoading: isLoading || isLoadingUser,
    isAuthenticated: Boolean(user),
    isAuthError: isError,
    login,
    register,
    logout
  };
}