"use client";

import dayjs from "dayjs";
import { UploadDocumentForm } from "@/components/forms/upload-document-form";
import { SmartFolderImport } from "@/features/documents/components/smart-folder-import";
import { ImportPlannerRowsForm } from "@/features/import";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";

export function DocumentsRepositoryView() {
  const documents = useAppStore((state) => state.documents);

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold">Documents</h2>
          <p className="text-sm text-slate-600">Upload planner/circular references. Dashboards remain the primary experience.</p>
        </div>

        <UploadDocumentForm />
        <SmartFolderImport />
        <ImportPlannerRowsForm />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold">Uploaded References</h3>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{doc.title}</p>
                  <p className="text-sm text-slate-600">{doc.type} • {dayjs(doc.uploadedAt).format("DD MMM YYYY, hh:mm A")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </NavShell>
  );
}
