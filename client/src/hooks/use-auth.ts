import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthError: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Query to fetch current user
  const { data: user, isLoading: isLoadingUser, isError } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
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

      // Get user data from response
      const userData = await response.json();
      console.log("Login successful, user data received:", userData);

      // Update query cache
      await queryClient.setQueryData(['/api/auth/me'], userData);
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      toast({
        title: "Login successful",
        description: "Welcome back to FinSavvy!",
        variant: "success",
      });

      return userData;
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
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Clear local storage
      localStorage.removeItem('authToken');
      
      // Reset query cache
      queryClient.setQueryData(['/api/auth/me'], null);
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      // Force clear authentication state
      queryClient.clear();

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

  const value: AuthContextType = {
    user: user as User | null,
    isLoading: isLoading || isLoadingUser,
    isAuthenticated: Boolean(user),
    isAuthError: isError,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}