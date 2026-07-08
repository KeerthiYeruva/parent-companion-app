import { useEffect } from "react";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";

export function ScanHistoryView() {
  const scanHistory = useAppStore((state) => state.scanHistory);
  const hydrateScanHistory = useAppStore((state) => state.hydrateScanHistory);

  useEffect(() => {
    void hydrateScanHistory();
  }, [hydrateScanHistory]);

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">Import History</h2>
          <p className="text-sm text-slate-600">Recent school-file checks and their summary counts.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {scanHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No import history yet.</p>
          ) : (
            <ul className="space-y-2">
              {scanHistory.map((run) => (
                <li key={run.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{new Date(run.scannedAt).toLocaleString()}</p>
                  <p>{run.fileCount} files • {run.newCount} new • {run.changedCount} changed • {run.reviewCount} need review</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </NavShell>
  );
}