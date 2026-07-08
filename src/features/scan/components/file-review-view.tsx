"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";
import type { ScanSessionFileRecord } from "@/types/domain";

export function FileReviewView({ documentId }: { documentId: string }) {
  const queuedFile = useAppStore((state) => state.scanQueue.find((entry) => entry.documentId === documentId));
  const hydrateScanFile = useAppStore((state) => state.hydrateScanFile);
  const [persistedFile, setPersistedFile] = useState<ScanSessionFileRecord | undefined>(queuedFile);

  useEffect(() => {
    if (queuedFile) {
      setPersistedFile(queuedFile);
      return;
    }

    void hydrateScanFile(documentId).then((file) => {
      setPersistedFile(file);
    });
  }, [documentId, hydrateScanFile, queuedFile]);

  const file = queuedFile ?? persistedFile;

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">Scanned File Detail</h2>
          <p className="text-sm text-slate-600">Inspect extracted rows and validation issues for a scanned document.</p>
        </div>

        {!file ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            File not found in current scan queue. Run a new scan from <Link href="/scan" className="text-blue-700">Scan & Imports</Link>.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">{file.title}</h3>
              <p className="text-sm text-slate-600">{file.detectedType} • {file.relativePath}</p>
              <p className="text-sm text-slate-600">Items: {file.importPreviewSummary?.validRecords ?? 0} • Issues: {file.importPreviewSummary?.issuesCount ?? 0}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-slate-900">Extracted Rows</h3>
              {(file.rawRows ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No extracted rows found.</p>
              ) : (
                <ul className="space-y-2">
                  {file.rawRows?.map((row) => (
                    <li key={`${file.documentId}-${row.rowIndex}`} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                      {row.childName ?? "Unknown child"} • {row.category ?? "Unknown category"} • {row.subject ? `${row.subject} • ` : ""}
                      {row.title} • {row.dueDate ?? "No date"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {file.importPreviewIssues && file.importPreviewIssues.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 font-semibold text-slate-900">Validation Issues</h3>
                <ul className="space-y-1">
                  {file.importPreviewIssues.map((issue) => (
                    <li key={issue.id} className="rounded-md bg-rose-50 px-2 py-1 text-sm text-rose-700">
                      {issue.issue}
                    </li>
                  ))}
                </ul>
                <Link href="/scan/review" className="mt-3 inline-block rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
                  Open Review Queue
                </Link>
              </div>
            ) : null}
          </>
        )}
      </section>
    </NavShell>
  );
}