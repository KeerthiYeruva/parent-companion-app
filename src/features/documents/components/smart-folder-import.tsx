import type { InputHTMLAttributes } from "react";
import { useMemo, useRef, useState } from "react";
import Link from "@/components/routing";
import {
  buildChildAliasMap,
  normalizeGrade,
} from "@/features/documents/services/child-alias-map";
import { detectPlannerDocument } from "@/features/documents/services/document-detector";
import { formatSchoolDocumentTitle } from "@/features/documents/services/document-title";
import { extractPdfText } from "@/features/documents/services/pdf-parser";
import { extractPlannerRows } from "@/features/documents/services/planner-text-extractor";
import { importPipeline } from "@/features/import";
import type { RawImportRecord } from "@/features/import";
import { appRepository } from "@/db/repositories/app-repository";
import { useAppStore } from "@/store/use-app-store";
import type {
  ChildProfile,
  ImportedItemReplacementScope,
  ImportIssue,
  ItemCategory,
  ScanSessionFileRecord,
  SchoolItem,
} from "@/types/domain";

const itemCategories: ItemCategory[] = [
  "Homework",
  "HomeStudy",
  "Activity",
  "ClassTest",
  "UnitTest",
  "Exam",
  "Project",
  "Circular",
];

const createConfidenceIssue = (
  documentId: string,
  issue: string,
): ImportIssue => ({
  id: `scan-confidence-${crypto.randomUUID()}`,
  documentId,
  fieldName: "parser",
  issue,
  resolved: false,
});

const countRowsByCategory = (rows: Array<{ category?: string }>) => {
  return rows.reduce<Partial<Record<ItemCategory, number>>>((counts, row) => {
    if (itemCategories.includes(row.category as ItemCategory)) {
      const category = row.category as ItemCategory;
      counts[category] = (counts[category] ?? 0) + 1;
    }

    return counts;
  }, {});
};

const buildScanConfidenceIssues = ({
  documentId,
  contentText,
  extractionStatus,
  categoryCounts,
  detectedType,
}: {
  documentId: string;
  contentText: string;
  extractionStatus: ScanSessionFileRecord["extractionStatus"];
  categoryCounts: Partial<Record<ItemCategory, number>>;
  detectedType: ScanSessionFileRecord["detectedType"];
}) => {
  const issues: ImportIssue[] = [];
  const hasExtractedText =
    extractionStatus === "success" && contentText.trim().length > 0;
  const totalRows = Object.values(categoryCounts).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );

  if (hasExtractedText && totalRows === 0) {
    issues.push(
      createConfidenceIssue(
        documentId,
        "Text was extracted, but no actionable school tasks were found.",
      ),
    );
  }

  if (
    /co\s*scholastic|physical\s+education|art\s*&\s*craft|karate|yoga/i.test(
      contentText,
    ) &&
    !categoryCounts.Activity
  ) {
    issues.push(
      createConfidenceIssue(
        documentId,
        "Co-scholastic activity content was detected, but no Activity items were extracted.",
      ),
    );
  }

  if (
    detectedType === "UnitTestPortion" &&
    /unit\s*test/i.test(contentText) &&
    /chapter\s+name|portion/i.test(contentText) &&
    !categoryCounts.UnitTest
  ) {
    issues.push(
      createConfidenceIssue(
        documentId,
        "Unit test portion content was detected, but no UnitTest items were extracted.",
      ),
    );
  }

  if (/graded\s+project/i.test(contentText) && !categoryCounts.Project) {
    issues.push(
      createConfidenceIssue(
        documentId,
        "Graded project content was detected, but no Project item was extracted.",
      ),
    );
  }

  if (
    /graded\s+lab\s+activity/i.test(contentText) &&
    !categoryCounts.Activity
  ) {
    issues.push(
      createConfidenceIssue(
        documentId,
        "Graded lab activity content was detected, but no Activity item was extracted.",
      ),
    );
  }

  return issues;
};

const formatCategoryCounts = (
  counts?: Partial<Record<ItemCategory, number>>,
) => {
  if (!counts) {
    return "No items found yet";
  }

  const entries = itemCategories
    .map((category) => [category, counts[category] ?? 0] as const)
    .filter(([, count]) => count > 0);
  return entries.length > 0
    ? entries.map(([category, count]) => `${category}: ${count}`).join(" • ")
    : "No weekly or monthly targets found";
};

const countExtractedItems = (
  counts?: Partial<Record<ItemCategory, number>>,
) => {
  return Object.values(counts ?? {}).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
};

const countChildAssignmentIssues = (issues?: ImportIssue[]) => {
  return (issues ?? []).filter((issue) => issue.fieldName === "childName")
    .length;
};

const formatCounts = (counts: Record<string, number>) => {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  return entries.length > 0
    ? entries.map(([label, count]) => `${label}: ${count}`).join(" • ")
    : "None yet";
};

const buildReplacementScope = (
  items: Array<Omit<SchoolItem, "id" | "status" | "completedAt">>,
): ImportedItemReplacementScope | undefined => {
  if (items.length === 0) {
    return undefined;
  }

  const dates = items.map((item) => item.dueDate).sort();
  return {
    childIds: Array.from(new Set(items.map((item) => item.childId))),
    categories: Array.from(new Set(items.map((item) => item.category))),
    fromDate: dates[0],
    toDate: dates[dates.length - 1],
  };
};

const isInReplacementScope = (
  item: SchoolItem,
  scope?: ImportedItemReplacementScope,
) => {
  if (!scope || !item.sourceDocumentId) {
    return false;
  }

  return (
    scope.childIds.includes(item.childId) &&
    scope.categories.includes(item.category) &&
    item.dueDate >= scope.fromDate &&
    item.dueDate <= scope.toDate
  );
};

const normalizeSubjectKey = (value?: string) =>
  value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const isGradeOrClassHint = (value: string) =>
  /^(grade|class)\b/i.test(value.trim());

const expandGradeHint = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const rangeMatch = normalized.match(
    /^(?:grade|class)\s*([0-9ivx]+)\s*[-–]\s*([0-9ivx]+)$/i,
  );
  if (rangeMatch?.[1] && rangeMatch[2]) {
    const start = Number(normalizeGrade(rangeMatch[1]));
    const end = Number(normalizeGrade(rangeMatch[2]));
    if (
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start > 0 &&
      end >= start
    ) {
      return Array.from({ length: end - start + 1 }, (_, index) =>
        String(start + index),
      );
    }
  }

  const singleMatch = normalized.match(/^(?:grade|class)\s*([0-9ivx]+)$/i);
  return singleMatch?.[1] ? [normalizeGrade(singleMatch[1])] : [];
};

const normalizeRowChildNames = (
  rows: RawImportRecord[],
  children: ChildProfile[],
  childNameToIdMap: Record<string, string>,
) => {
  const childNameById = new Map(
    children.map((child) => [child.id, child.name]),
  );

  return rows.map((row) => {
    const childId = row.childName
      ? childNameToIdMap[row.childName.trim().toLowerCase()]
      : undefined;
    return childId
      ? { ...row, childName: childNameById.get(childId) ?? row.childName }
      : row;
  });
};

const classifyRowsByChildProfile = (
  rows: RawImportRecord[],
  children: ChildProfile[],
  childNameToIdMap: Record<string, string>,
) => {
  const childrenByGrade = children.reduce<Record<string, ChildProfile[]>>(
    (acc, child) => {
      const grade = normalizeGrade(child.grade);
      acc[grade] = [...(acc[grade] ?? []), child];
      return acc;
    },
    {},
  );

  return rows.reduce<{
    importRows: RawImportRecord[];
    skippedRows: RawImportRecord[];
    ambiguousRows: RawImportRecord[];
    skippedReason?: string;
  }>(
    (result, row) => {
      const rawChildName = row.childName?.trim();
      if (!rawChildName || childNameToIdMap[rawChildName.toLowerCase()]) {
        result.importRows.push(row);
        return result;
      }

      const grade = normalizeGrade(rawChildName);
      const hintedGrades = expandGradeHint(rawChildName);
      const gradeChildren = (
        hintedGrades.length > 0 ? hintedGrades : [grade]
      ).flatMap((hintedGrade) => childrenByGrade[hintedGrade] ?? []);
      if (gradeChildren.length === 0) {
        result.skippedRows.push(row);
        result.skippedReason = `${rawChildName}: no matching child profile found`;
        return result;
      }

      gradeChildren.forEach((child) => {
        result.importRows.push({ ...row, childName: child.name });
      });
      return result;
    },
    { importRows: [], skippedRows: [], ambiguousRows: [] },
  );
};

const attachUnitTestDatesFromSchedule = (fileRows: RawImportRecord[][]) => {
  const scheduleBySubject = new Map<string, string>();
  const portionSubjects = new Set<string>();

  fileRows.flat().forEach((row) => {
    if (row.category !== "UnitTest" || !row.subject) {
      return;
    }

    if (row.dueDate) {
      scheduleBySubject.set(normalizeSubjectKey(row.subject), row.dueDate);
    }

    if (
      /unit test portion found without an exam schedule date/i.test(
        row.parserIssue ?? "",
      )
    ) {
      portionSubjects.add(normalizeSubjectKey(row.subject));
    }
  });

  return fileRows.map((rows) =>
    rows.flatMap((row) => {
      if (
        row.category === "UnitTest" &&
        row.dueDate &&
        portionSubjects.has(normalizeSubjectKey(row.subject))
      ) {
        return [];
      }

      if (row.category !== "UnitTest" || row.dueDate || !row.subject) {
        return [row];
      }

      const scheduleDate = scheduleBySubject.get(
        normalizeSubjectKey(row.subject),
      );
      if (
        !scheduleDate ||
        !/unit test portion found without an exam schedule date/i.test(
          row.parserIssue ?? "",
        )
      ) {
        return [row];
      }

      return [
        {
          ...row,
          title: `${row.subject} Unit Test`,
          description: (
            row.title ??
            row.description ??
            `${row.subject} portions`
          ).replace(/^Unit Test Portion:\s*/i, "Portions: "),
          dueDate: scheduleDate,
          parserIssue: undefined,
        },
      ];
    }),
  );
};

const buildConfidence = ({
  extractionStatus,
  issueCount,
  categoryCounts,
}: {
  extractionStatus: ScanSessionFileRecord["extractionStatus"];
  issueCount: number;
  categoryCounts: Partial<Record<ItemCategory, number>>;
}): ScanSessionFileRecord["confidence"] => {
  const totalRows = Object.values(categoryCounts).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  if (issueCount > 0) {
    return "review";
  }

  if (extractionStatus === "success" && totalRows > 0) {
    return "high";
  }

  return "low";
};

const formatConfidence = (confidence?: ScanSessionFileRecord["confidence"]) => {
  if (confidence === "high") {
    return "High Confidence";
  }

  if (confidence === "review") {
    return "Needs Review";
  }

  return "Low Confidence";
};

export function SmartFolderImport({ simple = false }: { simple?: boolean }) {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const children = useAppStore((state) => state.children);
  const documents = useAppStore((state) => state.documents);
  const deleteDocument = useAppStore((state) => state.deleteDocument);
  const items = useAppStore((state) => state.items);
  const addDocument = useAppStore((state) => state.addDocument);
  const addItem = useAppStore((state) => state.addItem);
  const replaceItemsForSourceDocuments = useAppStore(
    (state) => state.replaceItemsForSourceDocuments,
  );
  const scanQueue = useAppStore((state) => state.scanQueue);
  const setConnectedFolderName = useAppStore(
    (state) => state.setConnectedFolderName,
  );
  const setScanQueue = useAppStore((state) => state.setScanQueue);
  const pushPersistenceWarning = useAppStore(
    (state) => state.pushPersistenceWarning,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [lastRebuildSummary, setLastRebuildSummary] = useState<
    { cleared: number; imported: number } | undefined
  >();

  const directoryPickerProps: InputHTMLAttributes<HTMLInputElement> & {
    webkitdirectory?: string;
    directory?: string;
  } = {
    webkitdirectory: "",
    directory: "",
  };

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
  const scannedDocumentsSaved =
    scanQueue.length > 0 && saveableResults.length === 0;

  const existingItemKeys = useMemo(() => {
    return new Set(
      items.map((item) =>
        [
          item.childId,
          item.category,
          item.subject ?? "",
          item.title.trim().toLowerCase(),
          item.dueDate,
          item.sourceDocumentId ?? "",
        ].join("__"),
      ),
    );
  }, [items]);

  const readyUnimportedCount = useMemo(() => {
    return scanQueue.reduce((count, result) => {
      return (
        count +
        (result.importPreviewItems ?? []).filter(
          (item) =>
            !existingItemKeys.has(
              [
                item.childId,
                item.category,
                item.subject ?? "",
                item.title.trim().toLowerCase(),
                item.dueDate,
                item.sourceDocumentId ?? "",
              ].join("__"),
            ),
        ).length
      );
    }, 0);
  }, [existingItemKeys, scanQueue]);

  const scannedSourceDocumentIds = useMemo(() => {
    return Array.from(new Set(scanQueue.map((result) => result.documentId)));
  }, [scanQueue]);

  const readyPreviewItems = useMemo(
    () => scanQueue.flatMap((result) => result.importPreviewItems ?? []),
    [scanQueue],
  );
  const scannedItemsImported =
    readyPreviewItems.length > 0 && readyUnimportedCount === 0;
  const replacementScope = useMemo(
    () => buildReplacementScope(readyPreviewItems),
    [readyPreviewItems],
  );

  const replaceableImportedCount = useMemo(() => {
    const scannedSourceDocumentIdSet = new Set(scannedSourceDocumentIds);
    return items.filter(
      (item) =>
        (item.sourceDocumentId &&
          scannedSourceDocumentIdSet.has(item.sourceDocumentId)) ||
        isInReplacementScope(item, replacementScope),
    ).length;
  }, [items, replacementScope, scannedSourceDocumentIds]);

  const scanTotals = useMemo(() => {
    return scanQueue.reduce(
      (totals, result) => {
        const extractedItems = countExtractedItems(
          result.importPreviewCategoryCounts,
        );
        const childAssignmentIssues = countChildAssignmentIssues(
          result.importPreviewIssues,
        );
        const readyItems = result.importPreviewItems ?? [];
        readyItems.forEach((item) => {
          const childName =
            children.find((child) => child.id === item.childId)?.name ??
            "Matched child";
          totals.byChild[childName] = (totals.byChild[childName] ?? 0) + 1;
          totals.byCategory[item.category] =
            (totals.byCategory[item.category] ?? 0) + 1;
        });

        return {
          items: totals.items + extractedItems,
          ready: totals.ready + readyItems.length,
          skipped: totals.skipped + (result.skippedImportCount ?? 0),
          assignmentIssues: totals.assignmentIssues + childAssignmentIssues,
          otherIssues:
            totals.otherIssues +
            Math.max(
              (result.importPreviewIssues?.length ?? 0) - childAssignmentIssues,
              0,
            ),
          byChild: totals.byChild,
          byCategory: totals.byCategory,
        };
      },
      {
        items: 0,
        ready: 0,
        skipped: 0,
        assignmentIssues: 0,
        otherIssues: 0,
        byChild: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
      },
    );
  }, [children, scanQueue]);

  const saveScannedDocuments = (results: ScanSessionFileRecord[]) => {
    results
      .filter((result) => result.status !== "duplicate")
      .forEach((result) => {
        const childIds = Array.from(
          new Set(
            (result.importPreviewItems ?? []).map((item) => item.childId),
          ),
        );
        addDocument({
          title: result.title,
          type:
            result.detectedType === "Unknown"
              ? "Circular"
              : result.detectedType,
          childIds,
          fileName: result.fileName,
          fileSize: result.fileSize,
          fileHash: result.fileHash,
          relativePath: result.relativePath,
          modifiedAt: result.modifiedAt,
          extractedMonth: result.monthLabel,
        });
      });
  };

  const importReadyItems = (results: ScanSessionFileRecord[]) => {
    results.forEach((result) => {
      result.importPreviewItems?.forEach((item) => {
        const key = [
          item.childId,
          item.category,
          item.subject ?? "",
          item.title.trim().toLowerCase(),
          item.dueDate,
          item.sourceDocumentId ?? "",
        ].join("__");
        if (!existingItemKeys.has(key)) {
          addItem(item);
        }
      });
    });
  };

  const scanFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsScanning(true);
    setLastRebuildSummary(undefined);

    try {
      const scannedAt = new Date().toISOString();
      const scanRunId = `scan-run-${crypto.randomUUID()}`;
      const allFiles = Array.from(files);
      const pdfFiles = allFiles.filter(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf"),
      );

      if (pdfFiles.length === 0) {
        pushPersistenceWarning(
          "No PDF files were found in the selected folder.",
        );
        return;
      }

      if (pdfFiles.length < allFiles.length) {
        pushPersistenceWarning(
          "Only PDF files are scanned. Non-PDF files were skipped.",
        );
      }

      const firstRelativePath = (
        pdfFiles[0] as File & { webkitRelativePath?: string }
      ).webkitRelativePath;
      const rootFolderName =
        firstRelativePath?.split("/")[0] || "Selected folder";
      const scannedFiles = [];
      const scanChildren =
        children.length > 0
          ? children
          : await appRepository.listChildren().catch(() => []);
      const scanChildNameToIdMap = buildChildAliasMap(scanChildren);

      for (const file of pdfFiles) {
        let contentText = "";
        let extractionStatus: ScanSessionFileRecord["extractionStatus"] =
          "empty";
        let extractionError: string | undefined;
        try {
          contentText = await extractPdfText(file);
          extractionStatus =
            contentText.trim().length > 0 ? "success" : "empty";
        } catch (error) {
          console.error(error);

          extractionError =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : "PDF text extraction failed.";
        }

        const relativePath =
          (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
          file.name;
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
              childNames: [
                ...Object.keys(scanChildNameToIdMap),
                ...detected.childHints.filter(isGradeOrClassHint),
              ],
            })
          : [];

        scannedFiles.push({
          file,
          contentText,
          extractionStatus,
          extractionError,
          relativePath,
          detected,
          rawRows,
        });
      }

      const scheduledRowsByFile = attachUnitTestDatesFromSchedule(
        scannedFiles.map((entry) =>
          normalizeRowChildNames(
            entry.rawRows,
            scanChildren,
            scanChildNameToIdMap,
          ),
        ),
      );
      const nextResults = [];

      for (const [index, scannedFile] of scannedFiles.entries()) {
        const {
          file,
          contentText,
          extractionStatus,
          extractionError,
          relativePath,
          detected,
        } = scannedFile;
        const allRawRows = scheduledRowsByFile[index];
        const classifiedRows = classifyRowsByChildProfile(
          allRawRows,
          scanChildren,
          scanChildNameToIdMap,
        );
        const rawRows = classifiedRows.importRows;

        const importPreview =
          rawRows.length > 0
            ? importPipeline.run(rawRows, {
                sourceType: "future-pdf",
                documentId: detected.fileHash,
                childNameToIdMap: scanChildNameToIdMap,
              })
            : undefined;
        const categoryCounts = countRowsByCategory(allRawRows);
        const confidenceIssues = buildScanConfidenceIssues({
          documentId: detected.fileHash,
          contentText,
          extractionStatus,
          categoryCounts,
          detectedType: detected.detectedType,
        });
        const importPreviewIssues = [
          ...(importPreview?.issues ?? []),
          ...confidenceIssues,
        ];
        const importPreviewSummary = importPreview
          ? {
              ...importPreview.summary,
              issuesCount:
                importPreview.issues.length + confidenceIssues.length,
            }
          : confidenceIssues.length > 0
            ? {
                totalRecords: rawRows.length,
                normalizedRecords: rawRows.length,
                validRecords: 0,
                issuesCount: confidenceIssues.length,
              }
            : undefined;
        const confidence = buildConfidence({
          extractionStatus,
          issueCount: importPreviewIssues.length,
          categoryCounts,
        });

        const existing = existingByHash.get(detected.fileHash);
        const derivedStatus: ScanSessionFileRecord["status"] = existing
          ? existing.modifiedAt === new Date(file.lastModified).toISOString()
            ? "duplicate"
            : "changed"
          : "new";
        const status: ScanSessionFileRecord["status"] =
          importPreviewIssues.length > 0 && derivedStatus !== "duplicate"
            ? "review"
            : derivedStatus;

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
          extractionStatus,
          extractionError,
          extractedTextPreview: contentText.trim().slice(0, 500),
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
            parserIssue: row.parserIssue,
          })),
          importPreviewItems: importPreview?.items,
          importPreviewIssues,
          importPreviewCategoryCounts: categoryCounts,
          skippedImportCount: classifiedRows.skippedRows.length,
          skippedImportReason: classifiedRows.skippedReason,
          confidence,
          importPreviewSummary,
        });
      }

      setConnectedFolderName(rootFolderName);
      setScanQueue(nextResults, scannedAt);
      saveScannedDocuments(nextResults);
      importReadyItems(nextResults);
    } finally {
      setIsScanning(false);
    }
  };

  const replaceImportedItems = () => {
    if (readyPreviewItems.length === 0) {
      return;
    }

    replaceItemsForSourceDocuments(
      scannedSourceDocumentIds,
      readyPreviewItems,
      replacementScope,
    );
    setLastRebuildSummary({
      cleared: replaceableImportedCount,
      imported: readyPreviewItems.length,
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-slate-900">
          {simple ? "Upload School Documents" : "Add School Files"}
        </h3>
        <p className="text-sm text-slate-600">
          {simple
            ? "Choose the folder or PDFs from school. The app saves them, extracts targets, and updates Today, This Week, This Month, and Kids automatically."
            : "Choose a school folder and Parent Companion will save it and turn planner PDFs into tasks, tests, activities, and projects."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={pdfInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const input = event.currentTarget;
            void scanFiles(input.files).finally(() => {
              input.value = "";
            });
          }}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const input = event.currentTarget;
            void scanFiles(input.files).finally(() => {
              input.value = "";
            });
          }}
          className="hidden"
          {...directoryPickerProps}
        />
        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Choose PDFs
        </button>
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Choose Folder
        </button>
        <button
          type="button"
          onClick={replaceImportedItems}
          disabled={readyPreviewItems.length === 0}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rebuild Imported Items
        </button>
      </div>

      {isScanning ? (
        <p className="text-sm text-slate-600">
          Reading school files and building the family calendar...
        </p>
      ) : null}

      {!isScanning && scanQueue.length > 0 ? (
        simple ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-emerald-700">
              Imported for planning: {scanTotals.ready} item
              {scanTotals.ready === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-slate-600">
              Added matched school items from {scanQueue.length} document
              {scanQueue.length === 1 ? "" : "s"} to Today, Week, Month, and
              Kids.
            </p>
            {scanTotals.skipped > 0 ? (
              <p className="mt-1 text-slate-500">
                Ignored {scanTotals.skipped} row
                {scanTotals.skipped === 1 ? "" : "s"} for grades or children
                that are not set up in this app.
              </p>
            ) : null}
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div className="rounded-md bg-white p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  By Child
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatCounts(scanTotals.byChild)}
                </p>
              </div>
              <div className="rounded-md bg-white p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  By Type
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatCounts(scanTotals.byCategory)}
                </p>
              </div>
            </div>
            {scanTotals.assignmentIssues > 0 ? (
              <p className="mt-2 text-amber-800">
                Review exceptions: assign {scanTotals.assignmentIssues} item
                {scanTotals.assignmentIssues === 1 ? "" : "s"} to a child.
              </p>
            ) : null}
            {scanTotals.otherIssues > 0 ? (
              <p className="mt-1 text-rose-700">
                Review exceptions: {scanTotals.otherIssues} detail
                {scanTotals.otherIssues === 1 ? "" : "s"} need cleanup.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {scanTotals.assignmentIssues > 0 || scanTotals.otherIssues > 0 ? (
                <Link
                  href="/scan/review"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Review Exceptions
                </Link>
              ) : null}
              <Link
                href="/"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
              >
                Go to Today
              </Link>
              <Link
                href="/kids"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
              >
                Check Kids
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            {saveableResults.length > 0
              ? `${saveableResults.length} school file${saveableResults.length > 1 ? "s are" : " is"} ready to save.`
              : "All selected school files are saved."}
          </p>
        )
      ) : null}

      {scanQueue.length > 0 && !simple ? (
        <div className="space-y-2">
          {scanQueue.map((result) => (
            <article
              key={result.documentId}
              className="rounded-lg border border-slate-200 p-3"
            >
              {(() => {
                const extractedItems = countExtractedItems(
                  result.importPreviewCategoryCounts,
                );
                const childAssignmentIssues = countChildAssignmentIssues(
                  result.importPreviewIssues,
                );
                return (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          {formatSchoolDocumentTitle(
                            result.fileName,
                            result.detectedType,
                          )}
                        </p>
                        <p className="text-sm text-slate-600">
                          {result.detectedType} •{" "}
                          {result.monthLabel ?? "Month unknown"} •{" "}
                          {result.relativePath}
                        </p>
                        {result.skippedImportCount ? (
                          <p className="mt-1 text-sm text-amber-800">
                            Skipped {result.skippedImportCount} item
                            {result.skippedImportCount === 1 ? "" : "s"}:{" "}
                            {result.skippedImportReason ??
                              "no matching child profile found"}
                            .
                          </p>
                        ) : null}
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
                      <p className="mt-2 text-sm text-slate-600">
                        Hints: {result.childHints.join(", ")}
                      </p>
                    ) : null}
                    {result.importPreviewSummary ? (
                      <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                        <p className="font-medium text-emerald-700">
                          Items found: {extractedItems}
                        </p>
                        <p
                          className={`mt-1 text-xs font-semibold ${result.confidence === "high" ? "text-emerald-700" : result.confidence === "review" ? "text-amber-700" : "text-rose-700"}`}
                        >
                          {formatConfidence(result.confidence)}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatCategoryCounts(
                            result.importPreviewCategoryCounts,
                          )}
                        </p>
                        {childAssignmentIssues > 0 ? (
                          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-amber-800">
                            Child assignment needed for {childAssignmentIssues}{" "}
                            item{childAssignmentIssues > 1 ? "s" : ""}.
                          </p>
                        ) : null}
                        {(result.importPreviewIssues?.length ?? 0) >
                        childAssignmentIssues ? (
                          <p className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-rose-700">
                            {(result.importPreviewIssues?.length ?? 0) -
                              childAssignmentIssues}{" "}
                            detail
                            {(result.importPreviewIssues?.length ?? 0) -
                              childAssignmentIssues >
                            1
                              ? "s"
                              : ""}{" "}
                            need cleanup before import.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      Extraction: {result.extractionStatus ?? "unknown"}
                      {result.extractionError
                        ? ` • ${result.extractionError}`
                        : ""}
                    </p>
                  </>
                );
              })()}
            </article>
          ))}
        </div>
      ) : null}
      {simple && documents.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Imported Files
          </h3>
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {document.title}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {document.fileName ?? document.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Delete this file? This will also remove all homework, tests and activities created from it.",
                  );
                  if (confirmed) {
                    deleteDocument(document.id);
                  }
                }}
                className="shrink-0 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
