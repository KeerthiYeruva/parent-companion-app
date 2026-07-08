"use client";

import { useMemo } from "react";
import { buildChildAliasMap } from "@/features/documents/services/child-alias-map";
import { importPipeline } from "@/features/import";
import { ReviewRowEditor } from "@/features/scan/components/review-row-editor";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";
import type { ReviewDraftRecord } from "@/types/domain";

const toRawRow = (draft: ReviewDraftRecord) => ({
  childName: draft.childName,
  category: draft.category,
  subject: draft.subject,
  title: draft.title,
  dueDate: draft.dueDate,
  description: draft.description,
  sourceDocumentId: draft.sourceDocumentId,
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
          <h2 className="text-xl font-semibold text-slate-900">Review Queue</h2>
          <p className="text-sm text-slate-600">Correct extracted rows that could not be confidently matched before importing them.</p>
        </div>

        {filesNeedingReview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No files need review right now.</div>
        ) : (
          filesNeedingReview.map((file) => {
            const draftRows = buildDraftRows(file.documentId);

            return (
              <section key={file.documentId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{file.title}</h3>
                    <p className="text-sm text-slate-600">{file.detectedType} • {file.relativePath}</p>
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

                <div className="space-y-2">
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
                </div>
              </section>
            );
          })
        )}
      </section>
    </NavShell>
  );
}