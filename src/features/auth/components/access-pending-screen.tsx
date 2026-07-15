import { useAuth } from '@/features/auth/components/auth-context';

export function AccessPendingScreen() {
  const { signOut } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Access not available</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This family account is not approved for the Keerthi family planner.
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
