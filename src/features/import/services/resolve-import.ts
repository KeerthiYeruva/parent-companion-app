import type { ImportResolver } from "@/features/import/contracts/import-contracts";
import type {
  ImportPipelineOptions,
  NormalizedImportRecord,
} from "@/features/import/types/import-types";
import {
  buildLogicalItemKey,
  buildUnitTestDescription,
  buildUnitTestTitle,
  dedupeTextBlocks,
  mergeResolvedItemFields,
  normalizeCanonicalSubject,
  normalizeSubjectKey,
} from "@/features/import/services/import-content";

const isUnitTest = (record: NormalizedImportRecord) =>
  record.category === "UnitTest";

const recordRichness = (record: NormalizedImportRecord) => {
  return [
    record.description,
    record.chapterNumber,
    record.chapterName,
    record.title,
  ].filter(Boolean).length;
};

const pickRichestRecord = (records: NormalizedImportRecord[]) => {
  return [...records].sort(
    (left, right) => recordRichness(right) - recordRichness(left),
  )[0];
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
      },
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
    };
  }, first);
};

const mergeUnitTestGroup = (
  records: NormalizedImportRecord[],
  existingItems: NormalizedImportRecord[],
) => {
  const schedule = pickRichestRecord(
    records.filter((record) => Boolean(record.dueDate)),
  );
  const portion = pickRichestRecord(
    records.filter(
      (record) => record.sourceRole === "portion" || !record.dueDate,
    ),
  );
  const existing = pickRichestRecord(existingItems);
  const primary = schedule ?? existing ?? portion ?? records[0];

  if (!primary) {
    return undefined;
  }

  const subject = normalizeCanonicalSubject(
    primary.subject ??
      schedule?.subject ??
      portion?.subject ??
      existing?.subject,
  );
  const dueDate =
    schedule?.dueDate ??
    existing?.dueDate ??
    portion?.dueDate ??
    primary.dueDate;
  const description = buildUnitTestDescription({
    description: dedupeTextBlocks(
      portion?.description,
      existing?.description,
      schedule?.description,
    ),
    title: portion?.title,
    chapterNumber:
      portion?.chapterNumber ??
      existing?.chapterNumber ??
      schedule?.chapterNumber,
    chapterName:
      portion?.chapterName ?? existing?.chapterName ?? schedule?.chapterName,
    subject,
  });

  return {
    ...primary,
    ...schedule,
    ...existing,
    ...portion,
    childId:
      primary.childId ??
      schedule?.childId ??
      existing?.childId ??
      portion?.childId,
    subject,
    canonicalSubject: subject,
    title: buildUnitTestTitle(subject),
    description: description || undefined,
    chapterNumber:
      portion?.chapterNumber ??
      existing?.chapterNumber ??
      schedule?.chapterNumber,
    chapterName:
      portion?.chapterName ?? existing?.chapterName ?? schedule?.chapterName,
    dueDate,
    sourceDocumentId:
      schedule?.sourceDocumentId ??
      existing?.sourceDocumentId ??
      portion?.sourceDocumentId ??
      primary.sourceDocumentId,
    sourceRole:
      schedule && portion
        ? "combined"
        : schedule
          ? "schedule"
          : portion
            ? "portion"
            : primary.sourceRole,
    parserIssue:
      schedule?.parserIssue ??
      portion?.parserIssue ??
      existing?.parserIssue ??
      primary.parserIssue,
  };
};

export const importResolver: ImportResolver = {
  resolve: (
    records: NormalizedImportRecord[],
    options: ImportPipelineOptions,
  ) => {
    const existingByUnitTestKey = new Map<string, NormalizedImportRecord[]>();
    (options.existingItems ?? []).forEach((item) => {
      if (item.category !== "UnitTest") {
        return;
      }

      const subject = normalizeCanonicalSubject(item.subject);
      const key = [item.childId, "UnitTest", normalizeSubjectKey(subject)].join(
        "__",
      );
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
        sourceRole: "source",
      });
      existingByUnitTestKey.set(key, current);
    });

    const unitTestGroups = new Map<string, NormalizedImportRecord[]>();
    const generalGroups = new Map<string, NormalizedImportRecord[]>();

    records.forEach((record) => {
      if (!record.childId || !record.category) {
        const key = buildLogicalItemKey({
          childId: record.childId ?? record.rawChildName ?? "",
          category: record.category ?? "Homework",
          subject: record.subject,
          dueDate: record.dueDate ?? "",
        });
        const current = generalGroups.get(key) ?? [];
        current.push(record);
        generalGroups.set(key, current);
        return;
      }

      if (isUnitTest(record)) {
        const key = [
          record.childId,
          "UnitTest",
          normalizeSubjectKey(record.canonicalSubject ?? record.subject),
        ].join("__");
        const current = unitTestGroups.get(key) ?? [];
        current.push(record);
        unitTestGroups.set(key, current);
        return;
      }

      const key = buildLogicalItemKey({
        childId: record.childId,
        category: record.category,
        subject: record.subject,
        dueDate: record.dueDate ?? "",
      });
      const current = generalGroups.get(key) ?? [];
      current.push(record);
      generalGroups.set(key, current);
    });

    const resolvedUnitTests = Array.from(unitTestGroups.entries()).flatMap(
      ([key, group]) => {
        const existing = existingByUnitTestKey.get(key) ?? [];
        const merged = mergeUnitTestGroup(group, existing);
        return merged ? [merged] : [];
      },
    );

    const resolvedGeneral = Array.from(generalGroups.values()).flatMap(
      (group) => {
        const merged = mergeGeneralRecords(group);
        return merged ? [merged] : [];
      },
    );

    return [...resolvedGeneral, ...resolvedUnitTests].map((record) => ({
      ...record,
      subject: record.subject ?? record.canonicalSubject,
      canonicalSubject:
        record.canonicalSubject ?? normalizeCanonicalSubject(record.subject),
    }));
  },
};
