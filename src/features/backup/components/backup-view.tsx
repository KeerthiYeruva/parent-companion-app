import { NavShell } from "@/components/nav-shell";
import { DataBackupPanel } from "@/features/planning/components/data-backup-panel";

export function BackupView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Data & Backup
          </h2>
          <p className="text-sm text-slate-600">
            Export, import, and manage planner data.
          </p>
        </div>

        <DataBackupPanel />
      </section>
    </NavShell>
  );
}
