import { useState, type FormEvent } from 'react';
import {
  createAccount,
  FAMILY_AUTH_EMAIL,
  FAMILY_USERNAME,
  FAMILY_USERNAME_LABEL,
  getFriendlyAuthError,
  signIn,
} from '@/features/auth/services/firebase-auth';

export function LoginScreen({ initialError }: { initialError?: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | undefined>(initialError);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'createAccount'>('signIn');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername || !password) {
      setError('Enter your username and password.');
      return;
    }

    if (normalizedUsername !== FAMILY_USERNAME) {
      setError(`Use the family username: ${FAMILY_USERNAME_LABEL}.`);
      return;
    }

    if (mode === 'createAccount' && password.length < 6) {
      setError('Choose a password with at least 6 characters.');
      return;
    }

    if (mode === 'createAccount' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      if (mode === 'createAccount') {
        await createAccount(FAMILY_AUTH_EMAIL, password);
      } else {
        await signIn(FAMILY_AUTH_EMAIL, password);
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError, mode));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            {mode === 'createAccount' ? 'Create Family Account' : 'Parent Companion'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'createAccount'
              ? 'Create the shared family account for this planner.'
              : 'Sign in to sync your family planner securely.'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              autoComplete={mode === 'createAccount' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          {mode === 'createAccount' ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {submitting
              ? mode === 'createAccount'
                ? 'Creating account...'
                : 'Signing in...'
              : mode === 'createAccount'
                ? 'Create account'
                : 'Sign in'}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setMode((current) => (current === 'signIn' ? 'createAccount' : 'signIn'));
              setError(undefined);
              setConfirmPassword('');
            }}
            className="min-h-11 w-full text-sm font-medium text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {mode === 'createAccount'
              ? 'Already have an account? Sign in'
              : 'First time here? Create Family Account'}
          </button>
        </form>
      </section>
    </main>
  );
}
