'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  username: string;
  email: string;
  role: 'admin' | 'member';
  avatar: string;
  joinedAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem('metromovies_auth_user') ||
        localStorage.getItem('kisskh_auth_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // Ignore
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Master admin credentials
    if ((username === 'admin' && password === 'admin123') || (username === 'dbarya' && password === 'admin123')) {
      const adminUser: User = {
        username: username,
        email: `${username}@metromovies.local`,
        role: 'admin',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        joinedAt: new Date().toISOString(),
      };
      setUser(adminUser);
      localStorage.setItem('metromovies_auth_user', JSON.stringify(adminUser));
      return { success: true };
    }

    // Check custom registered users from localStorage
    try {
      const storedUsers = JSON.parse(
        localStorage.getItem('metromovies_registered_users') ||
        localStorage.getItem('kisskh_registered_users') ||
        '{}'
      );
      if (storedUsers[username] && storedUsers[username].password === password) {
        const memberUser: User = {
          username: username,
          email: storedUsers[username].email || `${username}@metromovies.local`,
          role: 'member',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          joinedAt: storedUsers[username].joinedAt || new Date().toISOString(),
        };
        setUser(memberUser);
        localStorage.setItem('metromovies_auth_user', JSON.stringify(memberUser));
        return { success: true };
      }
    } catch {
      // Ignore
    }

    return { success: false, message: 'Invalid username or password. Default Admin: admin / admin123' };
  };

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    if (!username.trim() || !password.trim()) {
      return { success: false, message: 'Username and password cannot be empty.' };
    }

    try {
      const storedUsers = JSON.parse(
        localStorage.getItem('metromovies_registered_users') ||
        localStorage.getItem('kisskh_registered_users') ||
        '{}'
      );
      if (storedUsers[username] || username.toLowerCase() === 'admin') {
        return { success: false, message: 'Username is already taken.' };
      }

      storedUsers[username] = {
        username,
        email: email || `${username}@metromovies.local`,
        password,
        joinedAt: new Date().toISOString(),
      };
      localStorage.setItem('metromovies_registered_users', JSON.stringify(storedUsers));

      const newUser: User = {
        username,
        email: email || `${username}@metromovies.local`,
        role: 'member',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        joinedAt: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem('metromovies_auth_user', JSON.stringify(newUser));
      return { success: true };
    } catch {
      return { success: false, message: 'Registration failed.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('metromovies_auth_user');
    localStorage.removeItem('kisskh_auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
