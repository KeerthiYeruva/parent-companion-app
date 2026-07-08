"use client";

import dayjs from "dayjs";
import { ChildDetailLayout } from "@/features/children/components/child-detail-layout";
import { useAppStore } from "@/store/use-app-store";

export function ChildDocumentsView({ childId }: { childId: string }) {
  const documents = useAppStore((state) => state.documents.filter((doc) => doc.childIds.includes(childId) || doc.childIds.length === 0));

  return (
    <ChildDetailLayout childId={childId} title="Documents">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold">Document References</h3>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents linked to this child yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{doc.title}</p>
                <p className="text-sm text-slate-600">{doc.type} • {doc.extractedMonth ?? "Month unknown"} • {dayjs(doc.uploadedAt).format("DD MMM YYYY")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ChildDetailLayout>
  );
}