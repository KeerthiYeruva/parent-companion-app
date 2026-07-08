import type { ImportPipeline } from "@/features/import/contracts/import-contracts";
import type { ImportPipelineOptions, ImportPipelineResult, RawImportRecord } from "@/features/import/types/import-types";
import { importItemBuilder } from "@/features/import/services/build-items";
import { importNormalizer } from "@/features/import/services/normalize-import";
import { importValidator } from "@/features/import/services/validate-import";

export const importPipeline: ImportPipeline = {
  run: (records: RawImportRecord[], options: ImportPipelineOptions): ImportPipelineResult => {
    const normalized = importNormalizer.normalize(records, options);
    const { validRecords, issues } = importValidator.validate(normalized, options);
    const items = importItemBuilder.buildItems(validRecords);

    return {
      normalizedRecords: normalized,
      items,
      issues,
      summary: {
        totalRecords: records.length,
        normalizedRecords: normalized.length,
        validRecords: validRecords.length,
        issuesCount: issues.length,
      },
    };
  },
};
