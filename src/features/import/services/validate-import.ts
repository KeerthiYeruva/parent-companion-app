import dayjs from "dayjs";
import type { ImportIssue } from "@/types/domain";
import type { ImportValidator } from "@/features/import/contracts/import-contracts";
import type { ImportPipelineOptions, NormalizedImportRecord } from "@/features/import/types/import-types";

const createIssue = (options: ImportPipelineOptions, index: number, fieldName: string, issue: string): ImportIssue => {
  return {
    id: `import-issue-${crypto.randomUUID()}`,
    documentId: options.documentId,
    rowIndex: index,
    fieldName,
    issue: `Row ${index + 1}: ${issue}`,
    resolved: false,
  };
};

const hasParentReadyTitle = (record: NormalizedImportRecord) => {
  const title = record.title.trim();
  const normalizedTitle = title.toLowerCase();
  const embeddedFullDates = title.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g) ?? [];

  if (title.length < 3 || title.length > 180 || embeddedFullDates.length > 1) {
    return false;
  }

  if (["activity", "project", "home study", "class test", "unit test"].includes(normalizedTitle)) {
    return Boolean(record.subject) && ["class test", "unit test"].includes(normalizedTitle);
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
  validate: (records: NormalizedImportRecord[], options: ImportPipelineOptions) => {
    const issues: ImportIssue[] = [];
    const validRecords: NormalizedImportRecord[] = [];

    records.forEach((record, index) => {
      if (!record.title) {
        issues.push(createIssue(options, index, "title", "Title is required"));
      } else if (!hasParentReadyTitle(record)) {
        issues.push(createIssue(options, index, "title", "Title is not parent-ready"));
      }

      if (!record.childId) {
        issues.push(createIssue(options, index, "childName", "Child could not be matched"));
      }

      if (!record.category) {
        issues.push(createIssue(options, index, "category", "Category is invalid or missing"));
      }

      if (!record.dueDate || !dayjs(record.dueDate, "YYYY-MM-DD", true).isValid()) {
        issues.push(createIssue(options, index, "dueDate", "Due date is invalid or missing"));
      }

      if (record.parserIssue) {
        issues.push(createIssue(options, index, "dueDate", record.parserIssue));
      }

      const hasErrorsForRecord = issues.some((issue) => issue.issue.startsWith(`Row ${index + 1}:`));
      if (!hasErrorsForRecord) {
        validRecords.push(record);
      }
    });

    return {
      validRecords,
      issues,
    };
  },
};
