import type { ScanSessionFileRecord } from "@/types/domain";

const countByStatus = (files: ScanSessionFileRecord[], status: ScanSessionFileRecord["status"]) => {
  return files.filter((file) => file.status === status).length;
};

export function ScanSummaryCards({ files, lastScanAt }: { files: ScanSessionFileRecord[]; lastScanAt?: string }) {
  const cards = [
    { label: "Ready to Add", value: countByStatus(files, "new") },
    { label: "Updated Files", value: countByStatus(files, "changed") },
    { label: "Already Saved", value: countByStatus(files, "duplicate") },
    { label: "Needs Details", value: countByStatus(files, "review") },
  ];

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-semibold text-slate-900">School Files</h2>
        <p className="text-sm text-slate-600">{lastScanAt ? `Last import check: ${new Date(lastScanAt).toLocaleString()}` : "No school files checked yet."}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}