import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@lanchat_token';
const USER_KEY = '@lanchat_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        try {
          const response = await fetch(new URL('/api/auth/me', getApiUrl()).toString(), {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
          } else {
            await clearAuth();
          }
        } catch {
          // Keep stored data if network fails
        }
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(new URL('/api/auth/logout', getApiUrl()).toString(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore logout API errors
    }
    await clearAuth();
  };

  const updateUser = async (data: Partial<User>) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(new URL('/api/users/profile', getApiUrl()).toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }

    const updatedUser = await response.json();
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(new URL('/api/auth/me', getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
