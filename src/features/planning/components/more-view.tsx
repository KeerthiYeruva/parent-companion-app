import { DatabaseBackup, FolderOpen, Users } from 'lucide-react';
import Link from '@/components/routing';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import { NavShell } from '@/components/nav-shell';

export const morePageLinks = [
  {
    href: '/more/profiles',
    title: 'Manage Kids',
    description: 'Add or update child profiles',
    icon: Users,
  },
  {
    href: '/documents',
    title: 'School Files',
    description: 'Upload, scan, review, and manage school documents',
    icon: FolderOpen,
  },
  {
    href: '/backup',
    title: 'Data & Backup',
    description: 'Export, import, and manage planner data',
    icon: DatabaseBackup,
  },
];

export function MoreView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">More</h2>
          <p className="text-sm text-slate-600">Manage profiles, school files, and planner data.</p>
        </div>

        <div className="grid gap-3">
          {morePageLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <link.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{link.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{link.description}</span>
              </span>
              <ChevronIcon className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>
    </NavShell>
  );
}
