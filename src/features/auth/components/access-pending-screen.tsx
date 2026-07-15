import { useState } from 'react';
import { useAuth } from '@/features/auth/components/auth-context';

export function AccessPendingScreen() {
  const { signOut, user } = useAuth();
  const [copyStatus, setCopyStatus] = useState<string>();

  if (!user) {
    return null;
  }

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopyStatus('User ID copied.');
    } catch {
      setCopyStatus('Could not copy the User ID. Select and copy it manually.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Account created</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account was created successfully, but access to this family planner has not been
          approved yet.
        </p>
        <p className="mt-4 text-sm font-medium text-slate-700">
          Copy your User ID and add it to the approved users in Firestore rules.
        </p>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Firebase User ID
          </p>
          <code className="mt-1 block break-all text-sm text-slate-900">{user.uid}</code>
        </div>

        {copyStatus ? (
          <p aria-live="polite" className="mt-3 text-sm text-slate-600">
            {copyStatus}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void copyUserId()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Copy User ID
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          After this User ID is added to the approved family list and the Firestore rules are
          published, reopen the app or retry sync.
        </p>
      </section>
    </main>
  );
}
