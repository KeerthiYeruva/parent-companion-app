"use client";

import type { InputHTMLAttributes } from "react";
import { useMemo, useState } from "react";
import { buildChildAliasMap } from "@/features/documents/services/child-alias-map";
import { detectPlannerDocument } from "@/features/documents/services/document-detector";
import { extractPdfText } from "@/features/documents/services/pdf-parser";
import { extractPlannerRows } from "@/features/documents/services/planner-text-extractor";
import { importPipeline } from "@/features/import";
import { useAppStore } from "@/store/use-app-store";
import type { ScanSessionFileRecord } from "@/types/domain";

export function SmartFolderImport() {
  const children = useAppStore((state) => state.children);
  const documents = useAppStore((state) => state.documents);
  const addDocument = useAppStore((state) => state.addDocument);
  const addItem = useAppStore((state) => state.addItem);
  const scanQueue = useAppStore((state) => state.scanQueue);
  const setConnectedFolderName = useAppStore((state) => state.setConnectedFolderName);
  const setScanQueue = useAppStore((state) => state.setScanQueue);
  const pushPersistenceWarning = useAppStore((state) => state.pushPersistenceWarning);
  const [isScanning, setIsScanning] = useState(false);

  const directoryPickerProps: InputHTMLAttributes<HTMLInputElement> & { webkitdirectory?: string; directory?: string } = {
    webkitdirectory: "",
    directory: "",
  };

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

  const saveableResults = useMemo(() => {
    return scanQueue.filter((result) => {
      return !documents.some(
        (doc) =>
          (result.fileHash && doc.fileHash === result.fileHash) ||
          (result.relativePath && doc.relativePath === result.relativePath),
      );
    });
  }, [documents, scanQueue]);

  const scanFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsScanning(true);

    try {
      const scannedAt = new Date().toISOString();
      const scanRunId = `scan-run-${crypto.randomUUID()}`;
      const allFiles = Array.from(files);
      const pdfFiles = allFiles.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

      if (pdfFiles.length === 0) {
        pushPersistenceWarning("No PDF files were found in the selected folder.");
        return;
      }

      if (pdfFiles.length < allFiles.length) {
        pushPersistenceWarning("Only PDF files are scanned. Non-PDF files were skipped.");
      }

      const firstRelativePath = (pdfFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
      const rootFolderName = firstRelativePath?.split("/")[0] || "Selected folder";
      const nextResults = [];

      for (const file of pdfFiles) {
        let contentText = "";
        try {
          contentText = await extractPdfText(file);
        } catch {
          pushPersistenceWarning(`PDF text extraction failed for ${file.name}. Classification may be incomplete.`);
        }

        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const detected = await detectPlannerDocument({
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
        const derivedStatus: ScanSessionFileRecord["status"] = existing
          ? existing.modifiedAt === new Date(file.lastModified).toISOString()
            ? "duplicate"
            : "changed"
          : "new";
        const status: ScanSessionFileRecord["status"] = importPreview && importPreview.issues.length > 0 && derivedStatus !== "duplicate" ? "review" : derivedStatus;

        nextResults.push({
          documentId: detected.fileHash,
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
          scannedAt,
          scanRunId,
          rawRows: rawRows.map((row, index) => ({
            documentId: detected.fileHash,
            rowIndex: index,
            childName: row.childName,
            category: row.category,
            subject: row.subject,
            title: row.title,
            dueDate: row.dueDate,
            description: row.description,
            sourceDocumentId: row.sourceDocumentId,
          })),
          importPreviewItems: importPreview?.items,
          importPreviewIssues: importPreview?.issues,
          importPreviewSummary: importPreview?.summary,
        });
      }

      setConnectedFolderName(rootFolderName);
      setScanQueue(nextResults, scannedAt);
    } finally {
      setIsScanning(false);
    }
  };

  const importScannedDocuments = () => {
    saveableResults
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
    scanQueue.forEach((result) => {
      result.importPreviewItems?.forEach((item) => {
        addItem(item);
      });
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-slate-900">Smart Folder Import</h3>
        <p className="text-sm text-slate-600">
          Choose a parent school folder from Downloads or any local location. The app scans its PDF files, reads subfolder paths, detects planner type, extracts month hints, and flags duplicates.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          <input
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={(event) => scanFiles(event.target.files)}
            className="hidden"
            {...directoryPickerProps}
          />
          Choose School Folder
        </label>
        <button
          type="button"
          onClick={importScannedDocuments}
          disabled={saveableResults.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Detected Files
        </button>
        <button
          type="button"
          onClick={importExtractedItems}
          disabled={!scanQueue.some((result) => (result.importPreviewItems?.length ?? 0) > 0)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import Extracted Items
        </button>
      </div>

      {isScanning ? <p className="text-sm text-slate-600">Scanning files and extracting text...</p> : null}

      {!isScanning && scanQueue.length > 0 ? (
        <p className="text-sm text-slate-600">
          {saveableResults.length > 0
            ? `${saveableResults.length} scanned file${saveableResults.length > 1 ? "s are" : " is"} ready to save as document references.`
            : "All scanned files are already saved as document references."}
        </p>
      ) : null}

      {scanQueue.length > 0 ? (
        <div className="space-y-2">
          {scanQueue.map((result) => (
            <article key={result.documentId} className="rounded-lg border border-slate-200 p-3">
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
              {result.importPreviewSummary ? (
                <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                  <p>
                    Extracted items: {result.importPreviewSummary.validRecords} | Issues: {result.importPreviewSummary.issuesCount}
                  </p>
                  {result.importPreviewIssues && result.importPreviewIssues.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {result.importPreviewIssues.slice(0, 3).map((issue) => (
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
