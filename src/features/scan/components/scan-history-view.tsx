import { useEffect } from 'react';
import { NavShell } from '@/components/nav-shell';
import { HeaderCard, PanelCard } from '@/components/ui/card';
import { useAppStore } from '@/store/use-app-store';

export function ScanHistoryView() {
  const scanHistory = useAppStore((state) => state.scanHistory);
  const hydrateScanHistory = useAppStore((state) => state.hydrateScanHistory);

  useEffect(() => {
    void hydrateScanHistory();
  }, [hydrateScanHistory]);

  return (
    <NavShell>
      <section className="space-y-3">
        <HeaderCard
          title="Import History"
          subtitle="Recent school-file checks and their summary counts."
        />

        <PanelCard>
          {scanHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No import history yet.</p>
          ) : (
            <ul className="space-y-2">
              {scanHistory.map((run) => (
                <li
                  key={run.id}
                  className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700"
                >
                  <p className="font-medium text-slate-900">
                    {new Date(run.scannedAt).toLocaleString()}
                  </p>
                  <p>
                    {run.fileCount} files • {run.newCount} new • {run.changedCount} changed •{' '}
                    {run.reviewCount} need review
                  </p>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </section>
    </NavShell>
  );
}
