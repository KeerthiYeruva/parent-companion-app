import type { SchoolItem } from "@/types/domain";

export type ImportSourceRole = "source" | "schedule" | "portion" | "combined";

const subjectAliases: Record<string, string> = {
  math: "Mathematics",
  maths: "Mathematics",
  mathematics: "Mathematics",
  computer: "Computer Science",
  "computer science": "Computer Science",
  computerscience: "Computer Science",
  sst: "Social Studies",
  social: "Social Studies",
  "social science": "Social Studies",
  "social studies": "Social Studies",
  gk: "General Knowledge",
  general: "General Knowledge",
  "general knowledge": "General Knowledge",
};

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

export const normalizeSubjectKey = (value?: string) => {
  return normalizeText(value ?? "").toLowerCase();
};

export const normalizeCanonicalSubject = (value?: string) => {
  const cleaned = normalizeText(value ?? "");
  if (!cleaned) {
    return undefined;
  }

  const alias = subjectAliases[normalizeSubjectKey(cleaned)];
  if (alias) {
    return alias;
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const buildImportKey = (
  item: Pick<
    SchoolItem,
    "childId" | "category" | "subject" | "dueDate" | "sourceDocumentId"
  >,
) => {
  return [
    item.childId,
    item.category,
    normalizeSubjectKey(item.subject),
    item.dueDate,
    item.sourceDocumentId ?? "",
  ].join("__");
};

export const buildLogicalItemKey = (
  item: Pick<SchoolItem, "childId" | "category" | "subject" | "dueDate">,
) => {
  return [
    item.childId,
    item.category,
    normalizeSubjectKey(item.subject),
    item.dueDate,
  ].join("__");
};

export const dedupeTextBlocks = (...values: Array<string | undefined>) => {
  const parts: string[] = [];
  values.forEach((value) => {
    if (!value) {
      return;
    }

    const text = normalizeText(value);
    if (!text) {
      return;
    }

    if (!parts.includes(text)) {
      parts.push(text);
    }
  });

  return parts.join("\n");
};

export const buildUnitTestTitle = (subject?: string) => {
  const canonicalSubject = normalizeCanonicalSubject(subject);
  return `${canonicalSubject ?? "Unit Test"} Unit Test`;
};

export const buildUnitTestDescription = (options: {
  description?: string;
  title?: string;
  chapterNumber?: string;
  chapterName?: string;
  subject?: string;
}) => {
  const chapter = options.chapterNumber
    ? options.chapterName
      ? `Chapter ${options.chapterNumber} — ${options.chapterName}`
      : `Chapter ${options.chapterNumber}`
    : undefined;
  return dedupeTextBlocks(
    chapter,
    options.description,
    options.title,
    options.subject ? `${options.subject} portions` : undefined,
  );
};

export const mergeResolvedItemFields = (
  current: Pick<
    SchoolItem,
    "title" | "description" | "chapterNumber" | "chapterName" | "subject"
  >,
  incoming: Pick<
    SchoolItem,
    "title" | "description" | "chapterNumber" | "chapterName" | "subject"
  >,
) => {
  const description = dedupeTextBlocks(
    incoming.description,
    current.description,
  );
  const title = normalizeText(incoming.title || current.title);

  return {
    title,
    description: description || undefined,
    chapterNumber: incoming.chapterNumber ?? current.chapterNumber,
    chapterName: incoming.chapterName ?? current.chapterName,
    subject: normalizeCanonicalSubject(incoming.subject ?? current.subject),
  };
};
