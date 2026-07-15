import { type ReactNode } from 'react';
import { LoginScreen } from '@/features/auth/components/login-screen';
import { useAuth } from '@/features/auth/components/auth-context';

export function AuthGate({ children }: { children: ReactNode }) {
  const { authenticated, authError, initializing } = useAuth();

  if (initializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm font-medium text-slate-600">Preparing secure sync...</p>
      </main>
    );
  }

  if (!authenticated) {
    return <LoginScreen initialError={authError} />;
  }

  return children;
}
