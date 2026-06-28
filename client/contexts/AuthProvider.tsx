'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

interface AuthUser {
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** @deprecated Use Clerk's SignIn component instead */
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();

  const authUser: AuthUser | null = useMemo(() => {
    if (!isSignedIn || !user) return null;
    return {
      username:
        user.username ??
        user.firstName ??
        user.emailAddresses[0]?.emailAddress?.split('@')[0] ??
        'User',
    };
  }, [isSignedIn, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: authUser,
      isAuthenticated: Boolean(isSignedIn),
      isLoading: !isLoaded,
      login: () => false,
      logout: () => { signOut(); },
    }),
    [authUser, isSignedIn, isLoaded, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
