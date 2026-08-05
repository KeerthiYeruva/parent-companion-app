import type { RawImportRecord } from '@/features/import';
import { importPipeline } from '@/features/import';
import {
  buildChildAliasMap,
  expandGradeHint,
  normalizeGrade,
} from '@/features/documents/services/child-alias-map';
import type {
  ChildProfile,
  ImportedItemReplacementScope,
  ItemCategory,
  ScanSessionFileRecord,
  SchoolItem,
  UploadedDocument,
} from '@/types/domain';

const normalizeSubjectKey = (value?: string) =>
  value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';

export const buildReplacementScope = (
  items: Array<Omit<SchoolItem, 'id' | 'status' | 'completedAt'>>
): ImportedItemReplacementScope | undefined => {
  if (items.length === 0) {
    return undefined;
  }

  const dates = items.map((item) => item.dueDate).sort();
  return {
    childIds: Array.from(new Set(items.map((item) => item.childId))),
    categories: Array.from(new Set(items.map((item) => item.category))) as ItemCategory[],
    fromDate: dates[0],
    toDate: dates[dates.length - 1],
  };
};

export const classifyRowsByChildProfile = (
  rows: RawImportRecord[],
  children: ChildProfile[],
  childNameToIdMap: Record<string, string>
) => {
  const childrenByGrade = children.reduce<Record<string, ChildProfile[]>>((acc, child) => {
    const grade = normalizeGrade(child.grade);
    acc[grade] = [...(acc[grade] ?? []), child];
    return acc;
  }, {});

  return rows.reduce<{
    importRows: RawImportRecord[];
    skippedRows: RawImportRecord[];
    ambiguousRows: RawImportRecord[];
    skippedReason?: string;
  }>(
    (result, row) => {
      const rawChildName = row.childName?.trim();
      if (!rawChildName || childNameToIdMap[rawChildName.toLowerCase()]) {
        result.importRows.push(row);
        return result;
      }

      const grade = normalizeGrade(rawChildName);
      const hintedGrades = expandGradeHint(rawChildName);
      const gradeChildren = (hintedGrades.length > 0 ? hintedGrades : [grade]).flatMap(
        (hintedGrade) => childrenByGrade[hintedGrade] ?? []
      );

      if (gradeChildren.length === 0) {
        result.skippedRows.push(row);
        result.skippedReason = `${rawChildName}: no matching child profile found`;
        return result;
      }

      gradeChildren.forEach((child) => {
        result.importRows.push({
          ...row,
          rawChildHint: row.rawChildHint ?? rawChildName,
          childName: child.name,
        });
      });
      return result;
    },
    { importRows: [], skippedRows: [], ambiguousRows: [] }
  );
};

export const attachUnitTestDatesFromSchedule = (
  files: Array<{ rows: RawImportRecord[]; isGradeSpecificSchedule: boolean }>
) => {
  const keyFor = (row: RawImportRecord) =>
    (row.childName?.trim().toLowerCase() ?? '') + '::' + normalizeSubjectKey(row.subject);
  const authoritativeChildren = new Set(
    files
      .filter((file) => file.isGradeSpecificSchedule)
      .flatMap((file) =>
        file.rows
          .filter(
            (row) =>
              row.category === 'UnitTest' && Boolean(row.childName && row.subject && row.dueDate)
          )
          .map((row) => row.childName!.trim().toLowerCase())
      )
  );
  const scheduleByKey = new Map<string, string>();
  const portionKeys = new Set<string>();

  files.forEach((file) =>
    file.rows.forEach((row) => {
      if (row.category !== 'UnitTest' || !row.subject || !row.childName) return;
      const childKey = row.childName.trim().toLowerCase();
      if (row.dueDate && (!authoritativeChildren.has(childKey) || file.isGradeSpecificSchedule)) {
        scheduleByKey.set(keyFor(row), row.dueDate);
      }
      if (/unit test portion found without an exam schedule date/i.test(row.parserIssue ?? '')) {
        portionKeys.add(keyFor(row));
      }
    })
  );

  const seenSchedules = new Set<string>();
  return files.map((file) =>
    file.rows.flatMap((row) => {
      if (row.category !== 'UnitTest' || !row.subject || !row.childName) return [row];
      const key = keyFor(row);
      const childKey = row.childName.trim().toLowerCase();
      if (row.dueDate) {
        if (
          (authoritativeChildren.has(childKey) && !file.isGradeSpecificSchedule) ||
          portionKeys.has(key) ||
          seenSchedules.has(key)
        ) {
          return [];
        }

        seenSchedules.add(key);
        return [row];
      }

      const isPortion = /unit test portion found without an exam schedule date/i.test(
        row.parserIssue ?? ''
      );
      const scheduleDate = scheduleByKey.get(key);
      if (!isPortion || !scheduleDate) return [row];

      return [
        {
          ...row,
          title: `${row.subject} Unit Test`,
          description: (row.title ?? row.description ?? `${row.subject} portions`).replace(
            /^Unit Test Portion:\s*/i,
            'Portions: '
          ),
          dueDate: scheduleDate,
          parserIssue: undefined,
        },
      ];
    })
  );
};

interface GradeRebuildOptions {
  childId: string;
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  scanQueue: ScanSessionFileRecord[];
  resolveScanFileByDocumentId: (documentId: string) => Promise<ScanSessionFileRecord | undefined>;
  replaceItemsForSourceDocuments: (
    sourceDocumentIds: string[],
    items: Array<Omit<SchoolItem, 'id' | 'status' | 'completedAt'>>,
    scope?: ImportedItemReplacementScope
  ) => void;
  pushWarning: (message: string) => void;
}

export const rebuildImportedItemsForChildFromStoredScans = async ({
  childId,
  children,
  items,
  documents,
  scanQueue,
  resolveScanFileByDocumentId,
  replaceItemsForSourceDocuments,
  pushWarning,
}: GradeRebuildOptions) => {
  const sourceIds = new Set<string>();

  items
    .filter((item) => item.childId === childId)
    .forEach((item) => {
      if (item.sourceDocumentId) {
        sourceIds.add(item.sourceDocumentId);
      }
      (item.sourceDocumentIds ?? []).forEach((sourceId) => sourceIds.add(sourceId));
    });

  documents
    .filter((document) => document.childIds.includes(childId))
    .forEach((document) => {
      if (document.fileHash) {
        sourceIds.add(document.fileHash);
      }
    });

  if (sourceIds.size === 0) {
    return;
  }

  const byId = new Map<string, ScanSessionFileRecord>();
  scanQueue.forEach((file) => {
    if (sourceIds.has(file.documentId)) {
      byId.set(file.documentId, file);
    }
  });

  await Promise.all(
    Array.from(sourceIds)
      .filter((sourceId) => !byId.has(sourceId))
      .map(async (sourceId) => {
        const persisted = await resolveScanFileByDocumentId(sourceId);
        if (persisted) {
          byId.set(sourceId, persisted);
        }
      })
  );

  const childNameToIdMap = buildChildAliasMap(children);
  const rowsByFile = Array.from(byId.values())
    .map((file) => {
      const rawRows = (file.rawRows ?? []).map<RawImportRecord>((row) => ({
        childName: row.rawChildHint ?? row.childName,
        rawChildHint: row.rawChildHint ?? row.childName,
        category: row.category,
        subject: row.subject,
        title: row.title,
        dueDate: row.dueDate,
        description: row.description,
        sourceDocumentId: row.sourceDocumentId ?? file.documentId,
        sourceDocumentIds: row.sourceDocumentIds ?? [row.sourceDocumentId ?? file.documentId],
        parserIssue: row.parserIssue,
      }));

      const classified = classifyRowsByChildProfile(rawRows, children, childNameToIdMap);
      return {
        rows: classified.importRows,
        isGradeSpecificSchedule:
          file.detectedType === 'ScholasticPlanner' &&
          classified.importRows.some((row) => row.category === 'UnitTest' && Boolean(row.dueDate)),
      };
    })
    .filter((entry) => entry.rows.length > 0);

  if (rowsByFile.length === 0) {
    pushWarning(
      'Grade was updated, but no scanned row details were found to rebuild imported items. Re-scan school files to refresh by grade.'
    );
    return;
  }

  const mergedRows = attachUnitTestDatesFromSchedule(rowsByFile).flat();
  const rebuilt = importPipeline.run(mergedRows, {
    sourceType: 'future-pdf',
    documentId: `grade-update-${childId}`,
    childNameToIdMap,
    existingItems: items,
  });

  const rebuiltChildItems = rebuilt.items.filter((item) => item.childId === childId);
  replaceItemsForSourceDocuments(
    Array.from(sourceIds),
    rebuiltChildItems,
    buildReplacementScope(rebuiltChildItems)
  );
};
