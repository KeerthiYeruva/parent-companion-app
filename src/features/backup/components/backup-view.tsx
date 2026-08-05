import { NavShell } from '@/components/nav-shell';
import { HeaderCard } from '@/components/ui/card';
import { DataBackupPanel } from '@/features/planning/components/data-backup-panel';

export function BackupView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <HeaderCard title="Data & Backup" subtitle="Export, import, and manage planner data." />

        <DataBackupPanel />
      </section>
    </NavShell>
  );
}
