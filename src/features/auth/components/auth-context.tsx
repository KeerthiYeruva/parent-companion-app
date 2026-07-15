import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  signOutUser,
  subscribeToAuthState,
  type AuthenticatedUser,
} from '@/features/auth/services/firebase-auth';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  initializing: boolean;
  authenticated: boolean;
  authError?: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  onAuthUserChange,
}: {
  children: ReactNode;
  onAuthUserChange?: (user: AuthenticatedUser | null) => void;
}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | undefined>();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      (nextUser) => {
        setUser(nextUser);
        setInitializing(false);
        setAuthError(undefined);
        onAuthUserChange?.(nextUser);
      },
      () => {
        setUser(null);
        setInitializing(false);
        setAuthError('Authentication could not be initialized. Please reload and try again.');
        onAuthUserChange?.(null);
      }
    );

    return unsubscribe;
  }, [onAuthUserChange]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      authenticated: Boolean(user),
      authError,
      signOut: async () => {
        try {
          await signOutUser();
        } catch {
          setAuthError('Sign out failed. Please try again.');
        }
      },
    }),
    [authError, initializing, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
};
