import type { ImportResolver } from '@/features/import/contracts/import-contracts';
import type {
  ImportPipelineOptions,
  NormalizedImportRecord,
} from '@/features/import/types/import-types';
import {
  buildLogicalItemKey,
  buildUnitTestDescription,
  buildUnitTestTitle,
  dedupeTextBlocks,
  mergeResolvedItemFields,
  normalizeCanonicalSubject,
  normalizeForComparison,
  normalizeSubjectKey,
} from '@/features/import/services/import-content';

const isUnitTest = (record: NormalizedImportRecord) => record.category === 'UnitTest';

const unitTestBaseKey = (
  record: Pick<NormalizedImportRecord, 'childId' | 'subject' | 'canonicalSubject'>
) =>
  [record.childId, 'UnitTest', normalizeSubjectKey(record.canonicalSubject ?? record.subject)].join(
    '__'
  );

const unitTestCycleKey = (record: NormalizedImportRecord) =>
  [unitTestBaseKey(record), record.dueDate ?? 'undated'].join('__');

const recordRichness = (record: NormalizedImportRecord) => {
  return [record.description, record.chapterNumber, record.chapterName, record.title].filter(
    Boolean
  ).length;
};

const pickRichestRecord = (records: NormalizedImportRecord[]) => {
  return [...records].sort((left, right) => recordRichness(right) - recordRichness(left))[0];
};

const mergeGeneralRecords = (records: NormalizedImportRecord[]) => {
  const [first, ...rest] = records;
  if (!first) {
    return undefined;
  }

  return rest.reduce((current, incoming) => {
    const merged = mergeResolvedItemFields(
      {
        title: current.title,
        description: current.description,
        chapterNumber: current.chapterNumber,
        chapterName: current.chapterName,
        subject: current.subject,
      },
      {
        title: incoming.title,
        description: incoming.description,
        chapterNumber: incoming.chapterNumber,
        chapterName: incoming.chapterName,
        subject: incoming.subject,
      }
    );

    return {
      ...current,
      ...incoming,
      subject: merged.subject,
      title: merged.title,
      description: merged.description,
      chapterNumber: merged.chapterNumber,
      chapterName: merged.chapterName,
      sourceRole: current.sourceRole ?? incoming.sourceRole,
      parserIssue: current.parserIssue ?? incoming.parserIssue,
      sourceDocumentId: current.sourceDocumentId ?? incoming.sourceDocumentId,
      sourceDocumentIds: mergeSourceDocumentIds(current, incoming),
    };
  }, first);
};

const mergeSourceDocumentIds = (
  ...records: Array<
    Pick<NormalizedImportRecord, 'sourceDocumentId' | 'sourceDocumentIds'> | undefined
  >
) =>
  Array.from(
    new Set(
      records.flatMap((record) =>
        record
          ? [
              ...(record.sourceDocumentIds ?? []),
              ...(record.sourceDocumentId ? [record.sourceDocumentId] : []),
            ]
          : []
      )
    )
  );

const isScheduleOnlyText = (value?: string) => {
  if (!value) {
    return false;
  }

  const normalized = normalizeForComparison(value);
  return (
    /\b\d{1,2}\s+\d{1,2}\s+\d{2,4}\b/.test(normalized) ||
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(normalized)
  );
};

const mergeUnitTestGroup = (
  records: NormalizedImportRecord[],
  existingItems: NormalizedImportRecord[]
) => {
  const schedule = pickRichestRecord(records.filter((record) => Boolean(record.dueDate)));
  const portion = pickRichestRecord(
    records.filter((record) => record.sourceRole === 'portion' || !record.dueDate)
  );
  const existing = pickRichestRecord(existingItems);
  const primary = schedule ?? existing ?? portion ?? records[0];

  if (!primary) {
    return undefined;
  }

  const subject = normalizeCanonicalSubject(
    primary.subject ?? schedule?.subject ?? portion?.subject ?? existing?.subject
  );
  const dueDate = schedule?.dueDate ?? existing?.dueDate ?? portion?.dueDate ?? primary.dueDate;
  const description = buildUnitTestDescription({
    description: dedupeTextBlocks(
      portion?.description,
      existing?.description,
      schedule?.sourceRole !== 'schedule' && !isScheduleOnlyText(schedule?.description)
        ? schedule?.description
        : undefined
    ),
    title: portion?.title,
    chapterNumber: portion?.chapterNumber ?? existing?.chapterNumber ?? schedule?.chapterNumber,
    chapterName: portion?.chapterName ?? existing?.chapterName ?? schedule?.chapterName,
    subject,
  });

  return {
    ...primary,
    ...schedule,
    ...existing,
    ...portion,
    childId: primary.childId ?? schedule?.childId ?? existing?.childId ?? portion?.childId,
    subject,
    canonicalSubject: subject,
    title: buildUnitTestTitle(subject),
    description: description || undefined,
    chapterNumber: portion?.chapterNumber ?? existing?.chapterNumber ?? schedule?.chapterNumber,
    chapterName: portion?.chapterName ?? existing?.chapterName ?? schedule?.chapterName,
    dueDate,
    sourceDocumentId:
      schedule?.sourceDocumentId ??
      existing?.sourceDocumentId ??
      portion?.sourceDocumentId ??
      primary.sourceDocumentId,
    sourceDocumentIds: mergeSourceDocumentIds(schedule, portion, existing, primary),
    sourceRole:
      schedule && portion
        ? 'combined'
        : schedule
          ? 'schedule'
          : portion
            ? 'portion'
            : primary.sourceRole,
    parserIssue:
      dueDate && description
        ? undefined
        : (portion?.parserIssue ??
          schedule?.parserIssue ??
          existing?.parserIssue ??
          primary.parserIssue),
  };
};

export const importResolver: ImportResolver = {
  resolve: (records: NormalizedImportRecord[], options: ImportPipelineOptions) => {
    const existingByUnitTestKey = new Map<string, NormalizedImportRecord[]>();
    (options.existingItems ?? []).forEach((item) => {
      if (item.category !== 'UnitTest') {
        return;
      }

      const subject = normalizeCanonicalSubject(item.subject);
      const key = [item.childId, 'UnitTest', normalizeSubjectKey(subject), item.dueDate].join('__');
      const current = existingByUnitTestKey.get(key) ?? [];
      current.push({
        childId: item.childId,
        category: item.category,
        subject,
        canonicalSubject: subject,
        title: item.title,
        dueDate: item.dueDate,
        description: item.description,
        chapterNumber: item.chapterNumber,
        chapterName: item.chapterName,
        sourceDocumentId: item.sourceDocumentId,
        sourceDocumentIds: item.sourceDocumentIds,
        sourceRole: 'source',
      });
      existingByUnitTestKey.set(key, current);
    });

    const unitTestGroups = new Map<string, NormalizedImportRecord[]>();
    const generalGroups = new Map<string, NormalizedImportRecord[]>();

    records.forEach((record) => {
      if (!record.childId || !record.category) {
        const key = buildLogicalItemKey({
          childId: record.childId ?? record.rawChildName ?? '',
          category: record.category ?? 'Homework',
          subject: record.subject,
          dueDate: record.dueDate ?? '',
          title: record.title,
          description: record.description,
        });
        const current = generalGroups.get(key) ?? [];
        current.push(record);
        generalGroups.set(key, current);
        return;
      }

      if (isUnitTest(record)) {
        const key = unitTestCycleKey(record);
        const current = unitTestGroups.get(key) ?? [];
        current.push(record);
        unitTestGroups.set(key, current);
        return;
      }

      const key = buildLogicalItemKey({
        childId: record.childId,
        category: record.category,
        subject: record.subject,
        dueDate: record.dueDate ?? '',
        title: record.title,
        description: record.description,
      });
      const current = generalGroups.get(key) ?? [];
      current.push(record);
      generalGroups.set(key, current);
    });

    Array.from(unitTestGroups.entries()).forEach(([key, group]) => {
      if (!key.endsWith('__undated')) {
        return;
      }

      const baseKey = key.replace(/__undated$/, '');
      const datedKeys = Array.from(unitTestGroups.keys()).filter(
        (candidate) => candidate.startsWith(`${baseKey}__`) && !candidate.endsWith('__undated')
      );

      if (datedKeys.length === 1) {
        unitTestGroups.set(datedKeys[0], [...(unitTestGroups.get(datedKeys[0]) ?? []), ...group]);
        unitTestGroups.delete(key);
      }
    });

    const resolvedUnitTests = Array.from(unitTestGroups.entries()).flatMap(([key, group]) => {
      const existing = existingByUnitTestKey.get(key) ?? [];
      const merged = mergeUnitTestGroup(group, existing);
      return merged ? [merged] : [];
    });

    const resolvedGeneral = Array.from(generalGroups.values()).flatMap((group) => {
      const merged = mergeGeneralRecords(group);
      return merged ? [merged] : [];
    });

    return [...resolvedGeneral, ...resolvedUnitTests].map((record) => ({
      ...record,
      subject: record.subject ?? record.canonicalSubject,
      canonicalSubject: record.canonicalSubject ?? normalizeCanonicalSubject(record.subject),
    }));
  },
};
