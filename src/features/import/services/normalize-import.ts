import dayjs from "dayjs";
import type { ItemCategory } from "@/types/domain";
import type { ImportNormalizer } from "@/features/import/contracts/import-contracts";
import type { ImportPipelineOptions, NormalizedImportRecord, RawImportRecord } from "@/features/import/types/import-types";

const categoryMap: Record<string, ItemCategory> = {
  homework: "Homework",
  "home-study": "HomeStudy",
  homestudy: "HomeStudy",
  activity: "Activity",
  "class-test": "ClassTest",
  classtest: "ClassTest",
  "unit-test": "UnitTest",
  unittest: "UnitTest",
  exam: "Exam",
  project: "Project",
  circular: "Circular",
};

const normalizeCategory = (value?: string): ItemCategory | undefined => {
  if (!value) {
    return undefined;
  }

  return categoryMap[value.trim().toLowerCase().replace(/\s+/g, "-")];
};

const normalizeDueDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return undefined;
  }

  return parsed.format("YYYY-MM-DD");
};

const normalizeChildId = (childName: string | undefined, options: ImportPipelineOptions): string | undefined => {
  if (!childName || !options.childNameToIdMap) {
    return undefined;
  }

  return options.childNameToIdMap[childName.trim().toLowerCase()];
};

export const importNormalizer: ImportNormalizer = {
  normalize: (records: RawImportRecord[], options: ImportPipelineOptions): NormalizedImportRecord[] => {
    return records.map((record) => {
      const rawChildName = record.childName?.trim();
      const rawCategory = record.category?.trim();

      return {
        childId: normalizeChildId(rawChildName, options),
        rawChildName,
        category: normalizeCategory(rawCategory),
        rawCategory,
        subject: record.subject?.trim(),
        title: record.title?.trim() ?? "",
        dueDate: normalizeDueDate(record.dueDate),
        description: record.description?.trim(),
        sourceDocumentId: record.sourceDocumentId ?? options.documentId,
      };
    });
  },
};
