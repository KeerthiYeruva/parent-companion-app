"use client";

import { useMemo } from "react";
import { buildChildAliasMap } from "@/features/documents/services/child-alias-map";
import { formatSchoolDocumentTitle } from "@/features/documents/services/document-title";
import { importPipeline } from "@/features/import";
import { ReviewRowEditor } from "@/features/scan/components/review-row-editor";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";
import type { ItemCategory, ReviewDraftRecord, ScanSessionFileRecord } from "@/types/domain";

const itemCategories: ItemCategory[] = ["Homework", "HomeStudy", "Activity", "ClassTest", "UnitTest", "Exam", "Project", "Circular"];

const formatCategoryCounts = (counts?: Partial<Record<ItemCategory, number>>) => {
  const entries = itemCategories.map((category) => [category, counts?.[category] ?? 0] as const).filter(([, count]) => count > 0);
  return entries.length > 0 ? entries.map(([category, count]) => `${category}: ${count}`).join(" • ") : "No weekly or monthly targets found";
};

const countExtractedItems = (file: ScanSessionFileRecord) => {
  return Object.values(file.importPreviewCategoryCounts ?? {}).reduce((sum, count) => sum + (count ?? 0), 0);
};

const countChildAssignmentIssues = (file: ScanSessionFileRecord) => {
  return (file.importPreviewIssues ?? []).filter((issue) => issue.fieldName === "childName").length;
};

const countIssueRows = (file: ScanSessionFileRecord) => {
  return new Set((file.importPreviewIssues ?? []).map((issue) => issue.rowIndex).filter((index): index is number => typeof index === "number")).size;
};

const toRawRow = (draft: ReviewDraftRecord) => ({
  childName: draft.childName,
  category: draft.category,
  subject: draft.subject,
  title: draft.title,
  dueDate: draft.dueDate,
  description: draft.description,
  sourceDocumentId: draft.sourceDocumentId,
  parserIssue: draft.parserIssue,
});

export function ReviewQueueView() {
  const children = useAppStore((state) => state.children);
  const addItem = useAppStore((state) => state.addItem);
  const scanQueue = useAppStore((state) => state.scanQueue);
  const reviewDrafts = useAppStore((state) => state.reviewDrafts);
  const upsertReviewDraft = useAppStore((state) => state.upsertReviewDraft);
  const clearReviewDraftsForDocument = useAppStore((state) => state.clearReviewDraftsForDocument);
  const updateScanFile = useAppStore((state) => state.updateScanFile);
  const markDocumentReviewed = useAppStore((state) => state.markDocumentReviewed);

  const childNameToIdMap = useMemo(() => buildChildAliasMap(children), [children]);
  const filesNeedingReview = scanQueue.filter((file) => (file.importPreviewIssues?.length ?? 0) > 0 || file.status === "review");

  const buildDraftRows = (documentId: string) => {
    const file = filesNeedingReview.find((entry) => entry.documentId === documentId);
    if (!file) {
      return [];
    }

    return (file.rawRows ?? []).map((row) => reviewDrafts.find((draft) => draft.documentId === documentId && draft.rowIndex === row.rowIndex) ?? row);
  };

  const assignChildToDocument = (documentId: string, childName: string) => {
    const draftRows = buildDraftRows(documentId);
    draftRows.forEach((row) => {
      upsertReviewDraft({ ...row, childName });
    });
  };

  const revalidateDocument = (documentId: string) => {
    const file = filesNeedingReview.find((entry) => entry.documentId === documentId);
    if (!file) {
      return;
    }

    const draftRows = buildDraftRows(documentId);
    const result = importPipeline.run(draftRows.map(toRawRow), {
      sourceType: "future-pdf",
      documentId,
      childNameToIdMap,
    });

    updateScanFile(documentId, (current) => ({
      ...current,
      rawRows: draftRows,
      importPreviewItems: result.items,
      importPreviewIssues: result.issues,
      importPreviewSummary: result.summary,
      status: result.issues.length > 0 ? "review" : "changed",
    }));
  };

  const importReviewedDocument = (documentId: string) => {
    const file = filesNeedingReview.find((entry) => entry.documentId === documentId);
    if (!file || !file.importPreviewItems || file.importPreviewItems.length === 0) {
      return;
    }

    file.importPreviewItems.forEach((item) => addItem(item));
    markDocumentReviewed(documentId);
    clearReviewDraftsForDocument(documentId);
    updateScanFile(documentId, (current) => ({
      ...current,
      status: "changed",
      importPreviewIssues: [],
      importPreviewSummary: current.importPreviewSummary
        ? {
            ...current.importPreviewSummary,
            issuesCount: 0,
          }
        : current.importPreviewSummary,
    }));
  };

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">Review Exceptions</h2>
          <p className="text-sm text-slate-600">Most rows should import automatically. This table appears only when child, type, subject, item, or date could not be mapped safely.</p>
        </div>

        {filesNeedingReview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No school files need review right now.</div>
        ) : (
          filesNeedingReview.map((file) => {
            const draftRows = buildDraftRows(file.documentId);

            return (
              <section key={file.documentId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{formatSchoolDocumentTitle(file.fileName, file.detectedType)}</h3>
                    <p className="text-sm text-slate-600">{file.detectedType} • {file.relativePath}</p>
                    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                      <p className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Ready: {file.importPreviewItems?.length ?? 0}</p>
                      <p className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-800">Needs help: {countIssueRows(file)}</p>
                      <p className="rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-700">Extracted: {countExtractedItems(file)}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatCategoryCounts(file.importPreviewCategoryCounts)}</p>
                    {countChildAssignmentIssues(file) > 0 ? (
                      <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-800">
                        Child assignment needed for {countChildAssignmentIssues(file)} item{countChildAssignmentIssues(file) > 1 ? "s" : ""}.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => revalidateDocument(file.documentId)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
                      Revalidate
                    </button>
                    <button
                      type="button"
                      onClick={() => importReviewedDocument(file.documentId)}
                      disabled={(file.importPreviewItems?.length ?? 0) === 0 || (file.importPreviewIssues?.length ?? 0) > 0}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Import Valid Rows
                    </button>
                  </div>
                </div>

                {countChildAssignmentIssues(file) > 0 && children.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-2 text-sm font-medium text-amber-900">Assign all extracted items in this file to:</p>
                    <div className="flex flex-wrap gap-2">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => assignChildToDocument(file.documentId, child.name)}
                          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">Show extracted rows</summary>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full border-collapse bg-white text-left">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Child</th>
                          <th className="px-2 py-2">Type</th>
                          <th className="px-2 py-2">Subject</th>
                          <th className="px-2 py-2">Extracted Item</th>
                          <th className="px-2 py-2">Date</th>
                          <th className="px-2 py-2">Needs Confirmation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftRows.map((row) => {
                          const issues = (file.importPreviewIssues ?? []).filter((issue) => issue.rowIndex === row.rowIndex).map((issue) => issue.issue);
                          return (
                            <ReviewRowEditor
                              key={`${file.documentId}-${row.rowIndex}`}
                              draft={row}
                              children={children}
                              issues={issues}
                              onChange={(updates) => upsertReviewDraft({ ...row, ...updates })}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            );
          })
        )}
      </section>
    </NavShell>
  );
}