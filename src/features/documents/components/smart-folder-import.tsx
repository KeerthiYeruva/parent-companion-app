"use client";

import { useMemo, useState } from "react";
import { buildChildAliasMap } from "@/features/documents/services/child-alias-map";
import { detectPlannerDocument } from "@/features/documents/services/document-detector";
import { extractPdfText } from "@/features/documents/services/pdf-parser";
import { extractPlannerRows } from "@/features/documents/services/planner-text-extractor";
import { importPipeline } from "@/features/import";
import type { FolderScanResult } from "@/features/documents/types/document-intelligence";
import { useAppStore } from "@/store/use-app-store";

export function SmartFolderImport() {
  const children = useAppStore((state) => state.children);
  const documents = useAppStore((state) => state.documents);
  const addDocument = useAppStore((state) => state.addDocument);
  const addItem = useAppStore((state) => state.addItem);
  const pushPersistenceWarning = useAppStore((state) => state.pushPersistenceWarning);
  const [scanResults, setScanResults] = useState<FolderScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const childNameToIdMap = useMemo(() => {
    return buildChildAliasMap(children);
  }, [children]);

  const existingByHash = useMemo(() => {
    const map = new Map<string, { modifiedAt?: string }>();
    documents.forEach((doc) => {
      if (doc.fileHash) {
        map.set(doc.fileHash, { modifiedAt: doc.modifiedAt });
      }
    });
    return map;
  }, [documents]);

  const scanFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsScanning(true);

    try {
      const nextResults: FolderScanResult[] = [];

      for (const file of Array.from(files)) {
        let contentText = "";
        if (file.type === "application/pdf") {
          try {
            contentText = await extractPdfText(file);
          } catch {
            pushPersistenceWarning(`PDF text extraction failed for ${file.name}. Classification may be incomplete.`);
          }
        }

        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const detected = detectPlannerDocument({
          name: file.name,
          relativePath,
          size: file.size,
          modifiedAt: new Date(file.lastModified).toISOString(),
          contentText,
        });

        const rawRows = contentText
          ? extractPlannerRows({
              contentText,
              relativePath,
              childNames: Object.keys(childNameToIdMap),
            })
          : [];

        const importPreview =
          rawRows.length > 0
            ? importPipeline.run(rawRows, {
                sourceType: "future-pdf",
                documentId: detected.fileHash,
                childNameToIdMap,
              })
            : undefined;

        const existing = existingByHash.get(detected.fileHash);
        const status = existing ? (existing.modifiedAt === new Date(file.lastModified).toISOString() ? "duplicate" : "changed") : "new";

        nextResults.push({
          title: detected.title,
          fileName: file.name,
          relativePath,
          fileHash: detected.fileHash,
          modifiedAt: new Date(file.lastModified).toISOString(),
          fileSize: file.size,
          detectedType: detected.detectedType,
          monthLabel: detected.monthLabel,
          childHints: detected.childHints,
          status,
          importPreview,
        });
      }

      setScanResults(nextResults);
    } finally {
      setIsScanning(false);
    }
  };

  const importScannedDocuments = () => {
    scanResults
      .filter((result) => result.status !== "duplicate")
      .forEach((result) => {
        addDocument({
          title: result.title,
          type: result.detectedType === "Unknown" ? "Circular" : result.detectedType,
          childIds: [],
          fileName: result.fileName,
          fileSize: result.fileSize,
          fileHash: result.fileHash,
          relativePath: result.relativePath,
          modifiedAt: result.modifiedAt,
          extractedMonth: result.monthLabel,
        });
      });
  };

  const importExtractedItems = () => {
    scanResults.forEach((result) => {
      result.importPreview?.items.forEach((item) => {
        addItem(item);
      });
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-slate-900">Smart Folder Import</h3>
        <p className="text-sm text-slate-600">
          Select multiple PDFs from your school folder. The app fingerprints each file, detects planner type, extracts month hints, and flags duplicates.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          <input type="file" multiple accept="application/pdf,.pdf" onChange={(event) => scanFiles(event.target.files)} className="hidden" />
          Scan Files
        </label>
        <button
          type="button"
          onClick={importScannedDocuments}
          disabled={scanResults.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Detected Files
        </button>
        <button
          type="button"
          onClick={importExtractedItems}
          disabled={!scanResults.some((result) => (result.importPreview?.items.length ?? 0) > 0)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import Extracted Items
        </button>
      </div>

      {isScanning ? <p className="text-sm text-slate-600">Scanning files and extracting text...</p> : null}

      {scanResults.length > 0 ? (
        <div className="space-y-2">
          {scanResults.map((result) => (
            <article key={result.fileHash} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{result.title}</p>
                  <p className="text-sm text-slate-600">
                    {result.detectedType} • {result.monthLabel ?? "Month unknown"} • {result.relativePath}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    result.status === "new"
                      ? "bg-emerald-100 text-emerald-700"
                      : result.status === "changed"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {result.status}
                </span>
              </div>
              {result.childHints.length > 0 ? (
                <p className="mt-2 text-sm text-slate-600">Hints: {result.childHints.join(", ")}</p>
              ) : null}
              {result.importPreview ? (
                <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                  <p>
                    Extracted items: {result.importPreview.summary.validRecords} | Issues: {result.importPreview.summary.issuesCount}
                  </p>
                  {result.importPreview.issues.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {result.importPreview.issues.slice(0, 3).map((issue) => (
                        <li key={issue.id} className="text-rose-700">
                          {issue.issue}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
