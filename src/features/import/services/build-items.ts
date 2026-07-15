import type { SchoolItem } from '@/types/domain';
import type { ImportItemBuilder } from '@/features/import/contracts/import-contracts';
import type { NormalizedImportRecord } from '@/features/import/types/import-types';

export const importItemBuilder: ImportItemBuilder = {
  buildItems: (
    records: NormalizedImportRecord[]
  ): Array<Omit<SchoolItem, 'id' | 'status' | 'completedAt'>> => {
    return records.map((record) => ({
      childId: record.childId!,
      category: record.category!,
      subject: record.subject ?? record.canonicalSubject,
      title: record.title,
      description: record.description,
      chapterNumber: record.chapterNumber,
      chapterName: record.chapterName,
      dueDate: record.dueDate!,
      sourceDocumentId: record.sourceDocumentId,
      sourceDocumentIds: record.sourceDocumentIds,
    }));
  },
};
