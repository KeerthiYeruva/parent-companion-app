"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SmartFolderImport } from "@/features/documents/components/smart-folder-import";
import { ScanSummaryCards } from "@/features/scan/components/scan-summary-cards";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";

export function ScanInboxView() {
  const scanQueue = useAppStore((state) => state.scanQueue);
  const scanHistory = useAppStore((state) => state.scanHistory);
  const lastScanAt = useAppStore((state) => state.lastScanAt);
  const connectedFolderName = useAppStore((state) => state.connectedFolderName);
  const hydrateScanHistory = useAppStore((state) => state.hydrateScanHistory);

  useEffect(() => {
    void hydrateScanHistory();
  }, [hydrateScanHistory]);

  return (
    <NavShell>
      <section className="space-y-3">
        <ScanSummaryCards files={scanQueue} lastScanAt={lastScanAt} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Connected source: {connectedFolderName ?? "No folder label yet"}
          <div className="mt-2 flex gap-2">
            <Link href="/scan/review" className="rounded-lg bg-slate-900 px-3 py-2 text-white">
              Open Review Queue
            </Link>
            <Link href="/scan/history" className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
              View Scan History
            </Link>
          </div>
        </div>

        <SmartFolderImport />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold text-slate-900">Current Scan Queue</h3>
          {scanQueue.length === 0 ? (
            <p className="text-sm text-slate-500">No scanned files yet.</p>
          ) : (
            <ul className="space-y-2">
              {scanQueue.map((file) => (
                <li key={file.documentId} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{file.title}</p>
                      <p className="text-sm text-slate-600">{file.detectedType} • {file.monthLabel ?? "Month unknown"} • {file.relativePath}</p>
                      <p className="text-sm text-slate-600">
                        Items: {file.importPreviewSummary?.validRecords ?? 0} • Issues: {file.importPreviewSummary?.issuesCount ?? 0}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{file.status}</span>
                      <Link href={`/scan/file/${encodeURIComponent(file.documentId)}`} className="text-sm text-blue-700">
                        Open
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {scanHistory.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 font-semibold text-slate-900">Recent Scan Runs</h3>
            <ul className="space-y-2">
              {scanHistory.slice(0, 5).map((run) => (
                <li key={run.id} className="text-sm text-slate-600">
                  {new Date(run.scannedAt).toLocaleString()} • {run.fileCount} files • {run.reviewCount} need review
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </NavShell>
  );
}