import type { ImportPipeline } from "@/features/import/contracts/import-contracts";
import type {
  ImportPipelineOptions,
  ImportPipelineResult,
  RawImportRecord,
} from "@/features/import/types/import-types";
import { importItemBuilder } from "@/features/import/services/build-items";
import { importNormalizer } from "@/features/import/services/normalize-import";
import { importResolver } from "@/features/import/services/resolve-import";
import { importValidator } from "@/features/import/services/validate-import";

export const importPipeline: ImportPipeline = {
  run: (
    records: RawImportRecord[],
    options: ImportPipelineOptions,
  ): ImportPipelineResult => {
    const normalized = importNormalizer.normalize(records, options);
    const resolved = importResolver.resolve(normalized, options);
    const { validRecords, issues } = importValidator.validate(
      resolved,
      options,
    );
    const items = importItemBuilder.buildItems(validRecords);

    return {
      normalizedRecords: normalized,
      resolvedRecords: resolved,
      items,
      issues,
      summary: {
        totalRecords: records.length,
        normalizedRecords: normalized.length,
        resolvedRecords: resolved.length,
        validRecords: validRecords.length,
        issuesCount: issues.length,
        blockingIssues: issues.filter(
          (issue) => issue.severity !== "warning" && issue.severity !== "info",
        ).length,
        warningIssues: issues.filter((issue) => issue.severity === "warning")
          .length,
      },
    };
  },
};
