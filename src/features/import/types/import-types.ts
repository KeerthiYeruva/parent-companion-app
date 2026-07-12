import type { ImportIssue, ItemCategory, SchoolItem } from "@/types/domain";
import type { ImportSourceRole } from "@/features/import/services/import-content";

export type ImportSourceType = "manual" | "csv" | "future-pdf";

export interface RawImportRecord {
  childName?: string;
  category?: string;
  subject?: string;
  title?: string;
  dueDate?: string;
  description?: string;
  chapterNumber?: string;
  chapterName?: string;
  sourceDocumentId?: string;
  sourceRole?: ImportSourceRole;
  parserIssue?: string;
}

export interface NormalizedImportRecord {
  childId?: string;
  rawChildName?: string;
  category?: ItemCategory;
  rawCategory?: string;
  subject?: string;
  canonicalSubject?: string;
  title: string;
  dueDate?: string;
  description?: string;
  chapterNumber?: string;
  chapterName?: string;
  sourceDocumentId?: string;
  sourceRole?: ImportSourceRole;
  parserIssue?: string;
}

export interface ImportPipelineOptions {
  sourceType: ImportSourceType;
  documentId: string;
  childNameToIdMap?: Record<string, string>;
  existingItems?: SchoolItem[];
}

export interface ImportPipelineSummary {
  totalRecords: number;
  normalizedRecords: number;
  resolvedRecords: number;
  validRecords: number;
  issuesCount: number;
  blockingIssues: number;
  warningIssues: number;
}

export interface ImportPipelineResult {
  normalizedRecords: NormalizedImportRecord[];
  resolvedRecords: NormalizedImportRecord[];
  items: Array<Omit<SchoolItem, "id" | "status" | "completedAt">>;
  issues: ImportIssue[];
  summary: ImportPipelineSummary;
}
