import dayjs from "dayjs";
import type { ImportIssue } from "@/types/domain";
import type { ImportValidator } from "@/features/import/contracts/import-contracts";
import type {
  ImportPipelineOptions,
  NormalizedImportRecord,
} from "@/features/import/types/import-types";

const createIssue = (
  options: ImportPipelineOptions,
  record: NormalizedImportRecord,
  index: number,
  fieldName: string,
  issue: string,
  severity: ImportIssue["severity"] = "blocking",
): ImportIssue => {
  return {
    id: `import-issue-${crypto.randomUUID()}`,
    documentId: record.sourceDocumentId ?? options.documentId,
    rowIndex: index,
    fieldName,
    issue: `Row ${index + 1}: ${issue}`,
    resolved: false,
    severity,
  };
};

const hasParentReadyTitle = (record: NormalizedImportRecord) => {
  const title = record.title.trim();
  const normalizedTitle = title.toLowerCase();
  const embeddedFullDates =
    title.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g) ?? [];

  if (title.length < 3 || title.length > 180 || embeddedFullDates.length > 1) {
    return false;
  }

  if (
    ["activity", "project", "home study", "class test", "unit test"].includes(
      normalizedTitle,
    )
  ) {
    return (
      Boolean(record.subject) &&
      ["class test", "unit test"].includes(normalizedTitle)
    );
  }

  if (/^[({[]/.test(title) || /^[.\s-]*\d{1,2}[./-]\d{1,2}/.test(title)) {
    return false;
  }

  if (/\bweek\s*\(|\bweek\s*\d+\b|\bs\s+th\s+th\b/i.test(title)) {
    return false;
  }

  return ![
    "all books and notebooks",
    "activities of the month",
    "school timing",
    "class timing",
    "summer vacation",
    "date day subject",
    "subject activities",
    "graded lab activity",
    "s.no",
  ].some((fragment) => normalizedTitle.includes(fragment));
};

export const importValidator: ImportValidator = {
  validate: (
    records: NormalizedImportRecord[],
    options: ImportPipelineOptions,
  ) => {
    const issues: ImportIssue[] = [];
    const validRecords: NormalizedImportRecord[] = [];

    records.forEach((record, index) => {
      if (!record.title) {
        issues.push(createIssue(options, record, index, "title", "Title is required"));
      } else if (!hasParentReadyTitle(record)) {
        issues.push(
          createIssue(options, record, index, "title", "Title is not parent-ready"),
        );
      }

      if (!record.childId) {
        issues.push(
          createIssue(
            options,
            record,
            index,
            "childName",
            "Child could not be matched",
          ),
        );
      }

      if (!record.category) {
        issues.push(
          createIssue(
            options,
            record,
            index,
            "category",
            "Category is invalid or missing",
          ),
        );
      }

      if (
        !record.dueDate ||
        !dayjs(record.dueDate, "YYYY-MM-DD", true).isValid()
      ) {
        issues.push(
          createIssue(
            options,
            record,
            index,
            "dueDate",
            "Due date is invalid or missing",
          ),
        );
      }

      if (record.parserIssue) {
        issues.push(
          createIssue(options, record, index, "parser", record.parserIssue, "warning"),
        );
      }

      const hasBlockingIssuesForRecord = issues.some(
        (issue) =>
          issue.issue.startsWith(`Row ${index + 1}:`) &&
          issue.severity !== "warning" &&
          issue.severity !== "info",
      );
      if (!hasBlockingIssuesForRecord) {
        validRecords.push(record);
      }
    });

    return {
      validRecords,
      issues,
    };
  },
};
