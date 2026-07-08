import type { ImportIssue, ItemCategory, SchoolItem } from "@/types/domain";

export type ImportSourceType = "manual" | "csv" | "future-pdf";

export interface RawImportRecord {
  childName?: string;
  category?: string;
  subject?: string;
  title?: string;
  dueDate?: string;
  description?: string;
  sourceDocumentId?: string;
  parserIssue?: string;
}

export interface NormalizedImportRecord {
  childId?: string;
  rawChildName?: string;
  category?: ItemCategory;
  rawCategory?: string;
  subject?: string;
  title: string;
  dueDate?: string;
  description?: string;
  sourceDocumentId?: string;
  parserIssue?: string;
}

export interface ImportPipelineOptions {
  sourceType: ImportSourceType;
  documentId: string;
  childNameToIdMap?: Record<string, string>;
}

export interface ImportPipelineSummary {
  totalRecords: number;
  normalizedRecords: number;
  validRecords: number;
  issuesCount: number;
}

export interface ImportPipelineResult {
  normalizedRecords: NormalizedImportRecord[];
  items: Array<Omit<SchoolItem, "id" | "status" | "completedAt">>;
  issues: ImportIssue[];
  summary: ImportPipelineSummary;
}
