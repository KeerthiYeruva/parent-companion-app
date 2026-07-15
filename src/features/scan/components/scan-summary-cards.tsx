import type { ScanSessionFileRecord } from '@/types/domain';

const countByStatus = (files: ScanSessionFileRecord[], status: ScanSessionFileRecord['status']) => {
  return files.filter((file) => file.status === status).length;
};

export function ScanSummaryCards({
  files,
  lastScanAt,
}: {
  files: ScanSessionFileRecord[];
  lastScanAt?: string;
}) {
  const cards = [
    { label: 'Ready', value: countByStatus(files, 'ready') },
    { label: 'Partially Ready', value: countByStatus(files, 'partiallyReady') },
    { label: 'Changed', value: countByStatus(files, 'changed') },
    { label: 'Needs Review', value: countByStatus(files, 'needsReview') },
  ];

  return (
    <section className="document-import__scan-summary space-y-3">
      <div className="document-import__scan-summary-header rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="document-import__scan-summary-title text-xl font-semibold text-slate-900">
          School Files
        </h2>
        <p className="document-import__scan-summary-date text-sm text-slate-600">
          {lastScanAt
            ? `Last import check: ${new Date(lastScanAt).toLocaleString()}`
            : 'No school files checked yet.'}
        </p>
      </div>

      <div className="document-import__scan-summary-cards grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="document-import__scan-summary-card rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="document-import__scan-summary-card-label text-sm text-slate-600">
              {card.label}
            </p>
            <p className="document-import__scan-summary-card-value text-3xl font-bold text-slate-900">
              {card.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
