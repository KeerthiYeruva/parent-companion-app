import { type ReactNode } from 'react';
import {
  ClipboardCheck,
  CloudCheck,
  CloudOff,
  House,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import Link, { usePathname } from '@/components/routing';
import { useAuth } from '@/features/auth/components/auth-context';
import { useAppStore } from '@/store/use-app-store';

export const primaryNavLinks = [
  { href: '/', label: 'Overview', icon: House },
  { href: '/tests', label: 'Tests', icon: ClipboardCheck },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

const morePaths = ['/more', '/documents', '/scan', '/kids', '/backup'];

export const isActiveLink = (pathname: string, href: string) => {
  if (href === '/') {
    return ['/', '/day', '/week', '/month'].includes(pathname);
  }

  if (href === '/more') {
    return morePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  const warnings = useAppStore((state) => state.persistenceWarnings);
  const clearWarnings = useAppStore((state) => state.clearPersistenceWarnings);
  const pendingItemSyncIds = useAppStore((state) => state.pendingItemSyncIds);
  const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);
  const syncStatus = useAppStore((state) => state.syncStatus);

  const retryPendingItemSync = useAppStore((state) => state.retryPendingItemSync);
  const showWarnings =
    warnings.length > 0 ||
    pendingSyncCount > 0 ||
    syncStatus === 'offline' ||
    syncStatus === 'syncing' ||
    syncStatus === 'signedOut' ||
    syncStatus === 'permissionDenied' ||
    syncStatus === 'unavailable' ||
    syncStatus === 'error';
  const syncMessage =
    warnings[0] ??
    (pendingSyncCount > 0
      ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync.`
      : syncStatus === 'signedOut'
        ? 'Sign in to enable cloud sync.'
        : syncStatus === 'offline'
          ? 'Offline. Local data is still available.'
          : syncStatus === 'syncing'
            ? 'Syncing...'
            : syncStatus === 'permissionDenied'
              ? 'Your account does not have access to this family planner.'
              : syncStatus === 'unavailable'
                ? 'Firebase sync is temporarily unavailable. Local data is still available.'
                : syncStatus === 'error'
                  ? 'Sync error. Local data is still available.'
                  : undefined);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Parent Companion</h1>

            <p className="hidden text-sm text-slate-600 lg:block">
              Today&apos;s school work, already organized from PDFs
            </p>
          </div>

          <nav className="hidden md:block">
            <ul className="flex items-center gap-1">
              {primaryNavLinks.map((link) => {
                const active = isActiveLink(pathname, link.href);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                        active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <link.icon aria-hidden="true" className="h-4 w-4" />
                        {link.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            {user?.email ? (
              <span className="hidden max-w-48 truncate text-xs text-slate-500 sm:block">
                {user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {showWarnings ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-3">
            <p className="text-sm text-amber-900">
              {syncStatus === 'offline' || syncStatus === 'signedOut' ? (
                <CloudOff aria-hidden="true" className="mr-2 inline h-4 w-4" />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw aria-hidden="true" className="mr-2 inline h-4 w-4" />
              ) : (
                <CloudCheck aria-hidden="true" className="mr-2 inline h-4 w-4" />
              )}
              {syncMessage}

              {warnings.length > 1
                ? ` (${warnings.length - 1} more warning${warnings.length - 1 > 1 ? 's' : ''})`
                : ''}
            </p>
            <div className="flex shrink-0 gap-2">
              {pendingSyncCount > 0 || pendingItemSyncIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    void retryPendingItemSync();
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-900 px-2 py-1 text-xs font-medium text-white"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Retry Sync
                </button>
              ) : null}

              <button
                type="button"
                onClick={clearWarnings}
                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-4 pb-24 md:pb-4">
        <main className="space-y-4">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-3 gap-1">
          {primaryNavLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-xs font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                >
                  <link.icon aria-hidden="true" className="h-5 w-5" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
