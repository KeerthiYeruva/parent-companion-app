import type { SchoolItem } from "@/types/domain";
import type { ImportItemBuilder } from "@/features/import/contracts/import-contracts";
import type { NormalizedImportRecord } from "@/features/import/types/import-types";

export const importItemBuilder: ImportItemBuilder = {
  buildItems: (records: NormalizedImportRecord[]): Array<Omit<SchoolItem, "id" | "status" | "completedAt">> => {
    return records.map((record) => ({
      childId: record.childId!,
      category: record.category!,
      subject: record.subject,
      title: record.title,
      description: record.description,
      dueDate: record.dueDate!,
      sourceDocumentId: record.sourceDocumentId,
    }));
  },
};
