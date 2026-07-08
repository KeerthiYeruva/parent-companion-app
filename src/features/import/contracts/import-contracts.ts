import type { ImportIssue, SchoolItem } from "@/types/domain";
import type { ImportPipelineOptions, ImportPipelineResult, NormalizedImportRecord, RawImportRecord } from "@/features/import/types/import-types";

export interface ImportNormalizer {
  normalize: (records: RawImportRecord[], options: ImportPipelineOptions) => NormalizedImportRecord[];
}

export interface ImportValidator {
  validate: (records: NormalizedImportRecord[], options: ImportPipelineOptions) => {
    validRecords: NormalizedImportRecord[];
    issues: ImportIssue[];
  };
}

export interface ImportItemBuilder {
  buildItems: (records: NormalizedImportRecord[]) => Array<Omit<SchoolItem, "id" | "status" | "completedAt">>;
}

export interface ImportPipeline {
  run: (records: RawImportRecord[], options: ImportPipelineOptions) => ImportPipelineResult;
}
