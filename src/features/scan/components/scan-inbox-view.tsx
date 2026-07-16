import { useEffect } from 'react';
import Link from '@/components/routing';
import { SmartFolderImport } from '@/features/documents/components/smart-folder-import';
import { formatSchoolDocumentTitle } from '@/features/documents/services/document-title';
import { ScanSummaryCards } from '@/features/scan/components/scan-summary-cards';
import { NavShell } from '@/components/nav-shell';
import { useAppStore } from '@/store/use-app-store';
import type { ItemCategory } from '@/types/domain';

const itemCategories: ItemCategory[] = [
  'Homework',
  'HomeStudy',
  'Activity',
  'ClassTest',
  'UnitTest',
  'Exam',
  'Project',
  'Circular',
];

const formatCategoryCounts = (counts?: Partial<Record<ItemCategory, number>>) => {
  if (!counts) {
    return 'No items found yet';
  }

  const entries = itemCategories
    .map((category) => [category, counts[category] ?? 0] as const)
    .filter(([, count]) => count > 0);
  return entries.length > 0
    ? entries.map(([category, count]) => `${category}: ${count}`).join(' | ')
    : 'No weekly or monthly targets found';
};

const countExtractedItems = (counts?: Partial<Record<ItemCategory, number>>) => {
  return Object.values(counts ?? {}).reduce((sum, count) => sum + (count ?? 0), 0);
};

const countChildAssignmentIssues = (file: {
  importPreviewIssues?: Array<{ fieldName: string }>;
}) => {
  return (file.importPreviewIssues ?? []).filter((issue) => issue.fieldName === 'childName').length;
};

const formatStatusLabel = (
  status: 'ready' | 'partiallyReady' | 'needsReview' | 'changed' | 'duplicate'
) => {
  if (status === 'ready') {
    return 'Ready';
  }

  if (status === 'partiallyReady') {
    return 'Partially Ready';
  }

  if (status === 'needsReview') {
    return 'Needs Review';
  }

  if (status === 'changed') {
    return 'Changed';
  }

  return 'Duplicate';
};

const formatConfidence = (confidence?: 'high' | 'review' | 'low') => {
  if (confidence === 'high') {
    return 'High Confidence';
  }

  if (confidence === 'review') {
    return 'Needs Review';
  }

  return 'Low Confidence';
};

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
          School folder: {connectedFolderName ?? 'No folder selected yet'}
          <div className="mt-2 flex gap-2">
            <Link href="/scan/review" className="rounded-lg bg-slate-900 px-3 py-2 text-white">
              Assign Items
            </Link>
            <Link
              href="/scan/history"
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              Import History
            </Link>
          </div>
        </div>

        <SmartFolderImport />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold text-slate-900">Files Ready for the Family Calendar</h3>
          {scanQueue.length === 0 ? (
            <p className="text-sm text-slate-500">No school files selected yet.</p>
          ) : (
            <ul className="space-y-2">
              {scanQueue.map((file) => (
                <li key={file.documentId} className="rounded-lg border border-slate-200 p-3">
                  {(() => {
                    const extractedItems = countExtractedItems(file.importPreviewCategoryCounts);
                    const childAssignmentIssues = countChildAssignmentIssues(file);
                    const otherIssues =
                      (file.importPreviewSummary?.issuesCount ?? 0) - childAssignmentIssues;
                    return (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {formatSchoolDocumentTitle(file.fileName, file.detectedType)}
                            </p>
                            <p className="text-sm text-slate-600">
                              {file.detectedType} | {file.monthLabel ?? 'Month unknown'} |{' '}
                              {file.relativePath}
                            </p>
                            <p className="text-sm font-medium text-emerald-700">
                              Items found: {extractedItems}
                            </p>
                            <p
                              className={`text-xs font-semibold ${file.confidence === 'high' ? 'text-emerald-700' : file.confidence === 'review' ? 'text-amber-700' : 'text-rose-700'}`}
                            >
                              {formatConfidence(file.confidence)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatCategoryCounts(file.importPreviewCategoryCounts)}
                            </p>
                            {childAssignmentIssues > 0 ? (
                              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-800">
                                Child assignment needed for {childAssignmentIssues} item
                                {childAssignmentIssues > 1 ? 's' : ''}.
                              </p>
                            ) : null}
                            {otherIssues > 0 ? (
                              <p className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-sm text-rose-700">
                                {otherIssues} detail{otherIssues > 1 ? 's' : ''} need cleanup before
                                import.
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${file.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : file.status === 'partiallyReady' ? 'bg-amber-100 text-amber-800' : file.status === 'needsReview' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}
                            >
                              {formatStatusLabel(file.status)}
                            </span>
                            <Link
                              href={`/scan/file/${encodeURIComponent(file.documentId)}`}
                              className="text-sm text-blue-700"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </div>

        {scanHistory.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 font-semibold text-slate-900">Recent Imports</h3>
            <ul className="space-y-2">
              {scanHistory.slice(0, 5).map((run) => (
                <li key={run.id} className="text-sm text-slate-600">
                  {new Date(run.scannedAt).toLocaleString()} | {run.fileCount} files |{' '}
                  {run.reviewCount} need review
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </NavShell>
  );
}
