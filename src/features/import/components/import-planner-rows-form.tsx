"use client";

import { useMemo, useState } from "react";
import { importPipeline } from "@/features/import";
import { parsePastedRows } from "@/features/import/services/parse-pasted-rows";
import type { ItemCategory } from "@/types/domain";
import type { RawImportRecord } from "@/features/import";
import { useAppStore } from "@/store/use-app-store";

const categories: ItemCategory[] = ["Homework", "HomeStudy", "Activity", "ClassTest", "UnitTest", "Exam", "Project", "Circular"];

export function ImportPlannerRowsForm() {
  const children = useAppStore((state) => state.children);
  const documents = useAppStore((state) => state.documents);
  const addItem = useAppStore((state) => state.addItem);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [lastRun, setLastRun] = useState<ReturnType<typeof importPipeline.run> | null>(null);
  const [reviewRows, setReviewRows] = useState<RawImportRecord[]>([]);

  const childNameToIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    children.forEach((child) => {
      map[child.name.trim().toLowerCase()] = child.id;
    });
    return map;
  }, [children]);

  const runPreviewForRows = (rows: RawImportRecord[]) => {
    const documentId = selectedDocumentId || "manual-import";
    const result = importPipeline.run(rows, {
      sourceType: "manual",
      documentId,
      childNameToIdMap,
    });

    setLastRun(result);
  };

  const runPreview = () => {
    const rows = parsePastedRows(inputText);
    setReviewRows(rows);
    runPreviewForRows(rows);
  };

  const updateReviewRow = (index: number, updates: Partial<RawImportRecord>) => {
    setReviewRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...updates } : row)));
  };

  const rerunReview = () => {
    runPreviewForRows(reviewRows);
  };

  const importValidRows = () => {
    if (!lastRun || lastRun.items.length === 0) {
      return;
    }

    lastRun.items.forEach((item) => addItem(item));
    setInputText("");
    setLastRun(null);
    setReviewRows([]);
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-slate-900">Import Planner Rows</h3>
        <p className="text-sm text-slate-600">
          Paste comma-separated rows in this order: childName, category, title, dueDate, description.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <select
          value={selectedDocumentId}
          onChange={(event) => setSelectedDocumentId(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">No linked document</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={runPreview} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Preview Import
        </button>
        <button
          type="button"
          onClick={rerunReview}
          disabled={reviewRows.length === 0}
          className="rounded-lg bg-slate-200 px-4 py-2 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Revalidate Rows
        </button>
        <button
          type="button"
          onClick={importValidRows}
          disabled={!lastRun || lastRun.items.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import Valid Items
        </button>
      </div>

      <textarea
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        rows={7}
        placeholder={"Aarav,Homework,Math worksheet,2026-07-10,Complete chapter 3\nMyra,ClassTest,Science revision,2026-07-12,Read chapter 4"}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
      />

      {reviewRows.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div>
            <h4 className="font-medium text-slate-900">Inline Review</h4>
            <p className="text-sm text-slate-600">Fix unmatched child, category, title, or due date fields and then revalidate.</p>
          </div>

          {reviewRows.map((row, index) => {
            const rowIssues = lastRun?.issues.filter((issue) => issue.rowIndex === index) ?? [];

            return (
              <div key={`${index}-${row.title ?? "row"}`} className="rounded-md border border-slate-200 p-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <select
                    value={row.childName ?? ""}
                    onChange={(event) => updateReviewRow(index, { childName: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">Select child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.name}>
                        {child.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={row.category ?? ""}
                    onChange={(event) => updateReviewRow(index, { category: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <input
                    value={row.title ?? ""}
                    onChange={(event) => updateReviewRow(index, { title: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Title"
                  />

                  <input
                    value={row.dueDate ?? ""}
                    onChange={(event) => updateReviewRow(index, { dueDate: event.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    type="date"
                  />
                </div>

                {rowIssues.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {rowIssues.map((issue) => (
                      <li key={issue.id} className="rounded-md bg-rose-50 px-2 py-1 text-sm text-rose-700">
                        {issue.issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-emerald-700">Row valid.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {lastRun ? (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm text-slate-700">
            Rows: {lastRun.summary.totalRecords} | Valid: {lastRun.summary.validRecords} | Issues: {lastRun.summary.issuesCount}
          </p>

          {lastRun.issues.length > 0 ? (
            <ul className="space-y-1">
              {lastRun.issues.map((issue) => (
                <li key={issue.id} className="rounded-md bg-rose-50 px-2 py-1 text-sm text-rose-700">
                  {issue.issue}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-700">No validation issues. Ready to import.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
