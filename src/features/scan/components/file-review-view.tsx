"use client";

import { useEffect, useState } from "react";
import Link from "@/components/routing";
import { NavShell } from "@/components/nav-shell";
import { formatSchoolDocumentTitle } from "@/features/documents/services/document-title";
import { useAppStore } from "@/store/use-app-store";
import type { ItemCategory, ScanSessionFileRecord } from "@/types/domain";

const itemCategories: ItemCategory[] = ["Homework", "HomeStudy", "Activity", "ClassTest", "UnitTest", "Exam", "Project", "Circular"];

const formatCategoryCounts = (counts?: Partial<Record<ItemCategory, number>>) => {
  if (!counts) {
    return "No items found yet";
  }

  const entries = itemCategories.map((category) => [category, counts[category] ?? 0] as const).filter(([, count]) => count > 0);
  return entries.length > 0 ? entries.map(([category, count]) => `${category}: ${count}`).join(" • ") : "No weekly or monthly targets found";
};

const countExtractedItems = (counts?: Partial<Record<ItemCategory, number>>) => {
  return Object.values(counts ?? {}).reduce((sum, count) => sum + (count ?? 0), 0);
};

const formatIssueForParent = (issue: string) => {
  const withoutRow = issue.replace(/^Row\s+\d+:\s*/i, "");
  if (/child could not be matched/i.test(withoutRow)) {
    return "Child assignment needed";
  }

  return withoutRow;
};

const formatConfidence = (confidence?: "high" | "review" | "low") => {
  if (confidence === "high") {
    return "High Confidence";
  }

  if (confidence === "review") {
    return "Needs Review";
  }

  return "Low Confidence";
};

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
          <h2 className="text-xl font-semibold text-slate-900">School File Detail</h2>
          <p className="text-sm text-slate-600">Check what Parent Companion found before adding it to the family calendar.</p>
        </div>

        {!file ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            File not found in the current school-file list. Choose files again from <Link href="/scan" className="text-blue-700">School Files</Link>.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">{formatSchoolDocumentTitle(file.fileName, file.detectedType)}</h3>
              <p className="text-sm text-slate-600">{file.detectedType} • {file.relativePath}</p>
              <p className="text-sm font-medium text-emerald-700">Items found: {countExtractedItems(file.importPreviewCategoryCounts)}</p>
              <p className={`mt-1 text-xs font-semibold ${file.confidence === "high" ? "text-emerald-700" : file.confidence === "review" ? "text-amber-700" : "text-rose-700"}`}>
                {formatConfidence(file.confidence)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatCategoryCounts(file.importPreviewCategoryCounts)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-slate-900">Tasks Found</h3>
              {(file.rawRows ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No tasks found in this file.</p>
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
                <h3 className="mb-2 font-semibold text-slate-900">Details Needed</h3>
                <ul className="space-y-1">
                  {file.importPreviewIssues.map((issue) => (
                    <li key={issue.id} className="rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-800">
                      {formatIssueForParent(issue.issue)}
                    </li>
                  ))}
                </ul>
                <Link href="/scan/review" className="mt-3 inline-block rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
                  Assign Items
                </Link>
              </div>
            ) : null}
          </>
        )}
      </section>
    </NavShell>
  );
}