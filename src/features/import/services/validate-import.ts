import dayjs from "dayjs";
import type { ImportIssue } from "@/types/domain";
import type { ImportValidator } from "@/features/import/contracts/import-contracts";
import type { ImportPipelineOptions, NormalizedImportRecord } from "@/features/import/types/import-types";

const createIssue = (options: ImportPipelineOptions, index: number, fieldName: string, issue: string): ImportIssue => {
  return {
    id: `import-issue-${crypto.randomUUID()}`,
    documentId: options.documentId,
    fieldName,
    issue: `Row ${index + 1}: ${issue}`,
    resolved: false,
  };
};

export const importValidator: ImportValidator = {
  validate: (records: NormalizedImportRecord[], options: ImportPipelineOptions) => {
    const issues: ImportIssue[] = [];
    const validRecords: NormalizedImportRecord[] = [];

    records.forEach((record, index) => {
      if (!record.title) {
        issues.push(createIssue(options, index, "title", "Title is required"));
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
