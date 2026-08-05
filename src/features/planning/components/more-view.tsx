import { useState } from 'react';
import { DatabaseBackup, FolderOpen, Users } from 'lucide-react';
import { ChevronIcon } from '@/components/ui/chevron-icon';
import { ArticleCard, HeaderCard } from '@/components/ui/card';
import { NavShell } from '@/components/nav-shell';
import { ChildrenManagementSection } from '@/features/children/components/children-management-view';
import { SmartFolderImport } from '@/features/documents/components/smart-folder-import';
import { DataBackupPanel } from '@/features/planning/components/data-backup-panel';

export const morePageLinks = [
  {
    id: 'profiles',
    title: 'Manage Kids',
    description: 'Add or update child profiles',
    icon: Users,
  },
  {
    id: 'school-files',
    title: 'School Files',
    description: 'Upload, scan, review, and manage school documents',
    icon: FolderOpen,
  },
  {
    id: 'backup',
    title: 'Data & Backup',
    description: 'Export, import, and manage planner data',
    icon: DatabaseBackup,
  },
];

const panelIdForSection = (id: string) => `more-panel-${id.replace(/[^a-z0-9]/gi, '-')}`;
const triggerIdForSection = (id: string) => `more-trigger-${id.replace(/[^a-z0-9]/gi, '-')}`;

export function MoreView() {
  const [openSectionId, setOpenSectionId] = useState<string>(morePageLinks[0]?.id ?? '');

  return (
    <NavShell>
      <section className="space-y-3">
        <HeaderCard title="More" subtitle="Manage profiles, school files, and planner data." />

        <div className="grid gap-3">
          {morePageLinks.map((link) => (
            <ArticleCard key={link.id}>
              <h3>
                <button
                  id={triggerIdForSection(link.id)}
                  type="button"
                  className="flex min-h-20 w-full items-center gap-3 p-4 text-left hover:bg-blue-50/40"
                  aria-expanded={openSectionId === link.id}
                  aria-controls={panelIdForSection(link.id)}
                  onClick={() => {
                    setOpenSectionId((current) => (current === link.id ? '' : link.id));
                  }}
                >
                  <span className="pc-icon-chip">
                    <link.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{link.title}</span>
                    <span className="mt-1 block text-sm text-slate-600">{link.description}</span>
                  </span>
                  <ChevronIcon
                    direction={openSectionId === link.id ? 'up' : 'down'}
                    className="h-4 w-4 shrink-0 text-slate-400"
                  />
                </button>
              </h3>

              <div
                id={panelIdForSection(link.id)}
                role="region"
                aria-labelledby={triggerIdForSection(link.id)}
                hidden={openSectionId !== link.id}
                className="border-t border-slate-200 px-4 pb-4 pt-3"
              >
                {link.id === 'profiles' ? <ChildrenManagementSection showHeader={false} /> : null}
                {link.id === 'school-files' ? <SmartFolderImport simple /> : null}
                {link.id === 'backup' ? <DataBackupPanel /> : null}
              </div>
            </ArticleCard>
          ))}
        </div>
      </section>
    </NavShell>
  );
}
