import type { ScanSessionFileRecord } from '@/types/domain';
import { ArticleCard, HeaderCard } from '@/components/ui/card';

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
      <HeaderCard
        title="School Files"
        subtitle={
          lastScanAt
            ? `Last import check: ${new Date(lastScanAt).toLocaleString()}`
            : 'No school files checked yet.'
        }
        className="document-import__scan-summary-header"
      />

      <div className="document-import__scan-summary-cards grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <ArticleCard key={card.label} className="document-import__scan-summary-card p-4">
            <p className="document-import__scan-summary-card-label text-sm text-slate-600">
              {card.label}
            </p>
            <p className="document-import__scan-summary-card-value text-3xl font-bold text-slate-900">
              {card.value}
            </p>
          </ArticleCard>
        ))}
      </div>
    </section>
  );
}
