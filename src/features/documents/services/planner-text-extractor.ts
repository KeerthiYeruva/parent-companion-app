import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { RawImportRecord } from "@/features/import";
import { extractMonthLabel } from "@/features/documents/services/month-extractor";

dayjs.extend(customParseFormat);

const categoryPatterns: Array<{ category: string; pattern: RegExp }> = [
  { category: "Homework", pattern: /\bhomework\b/i },
  { category: "ClassTest", pattern: /\bclass\s*test\b/i },
  { category: "UnitTest", pattern: /\bunit\s*test\b/i },
  {
    category: "Activity",
    pattern:
      /\b(?:graded\s+)?(?:activity|activities|dance|music|yoga|karate|art\s*&\s*craft|physical\s+education|cca|talk\s+the\s+talk)\b/i,
  },
  { category: "Project", pattern: /\b(?:graded\s+)?project\b/i },
  { category: "Exam", pattern: /\bexam\b/i },
  { category: "HomeStudy", pattern: /\bhome\s*study|revision\b/i },
  { category: "Circular", pattern: /\bcircular\b/i },
];

const datePatterns = [
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "D-M-YYYY",
  "DD-MM-YY",
  "D-M-YY",
  "DD/MM/YYYY",
  "D/M/YYYY",
  "DD/MM/YY",
  "D/M/YY",
  "DD.MM.YYYY",
  "D.M.YYYY",
  "DD.MM.YY",
  "D.M.YY",
  "DD MMM YYYY",
  "D MMM YYYY",
  "DD MMMM YYYY",
  "D MMMM YYYY",
  "DD MMM",
  "D MMM",
  "DD MMMM",
  "D MMMM",
];

const weekdayToken =
  "(?:mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)";
const weekdayIndexes: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};
const knownSubjects = [
  "Math",
  "Mathematics",
  "English",
  "Hindi",
  "Science",
  "Social",
  "Social Science",
  "EVS",
  "Computer",
  "Computer Science",
  "General knowledge",
  "GK",
  "Art",
  "Dance",
  "Kannada",
  "Music",
];

const coScholasticSubjects = [
  "Physical Education",
  "Dance",
  "Art & Craft",
  "Karate",
  "Music",
  "Yoga",
];
const unitTestSubjects = [
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Computer Science",
  "General knowledge",
  "Kannada",
];
const unitTestScheduleSubjects = [
  "Computer",
  "Computer Science",
  "Mathematics",
  "Hindi",
  "Science",
  "Kannada",
  "Social Studies",
  "English",
  "GK",
];

const schoolKeywordRows: Array<{
  category: string;
  subject?: string;
  pattern: RegExp;
  titlePrefix?: RegExp;
}> = [
  {
    category: "Activity",
    subject: "Dance",
    pattern: /^dance\b/i,
    titlePrefix: /^dance\b[:\-\s]*/i,
  },
  {
    category: "Activity",
    subject: "Music",
    pattern: /^music\b/i,
    titlePrefix: /^music\b[:\-\s]*/i,
  },
  {
    category: "Activity",
    subject: "Yoga",
    pattern: /^yoga\b/i,
    titlePrefix: /^yoga\b[:\-\s]*/i,
  },
  {
    category: "Activity",
    subject: "Karate",
    pattern: /^karate\b/i,
    titlePrefix: /^karate\b[:\-\s]*/i,
  },
  {
    category: "Activity",
    subject: "Art & Craft",
    pattern: /^art\s*&\s*craft\b/i,
    titlePrefix: /^art\s*&\s*craft\b[:\-\s]*/i,
  },
  {
    category: "Activity",
    subject: "Physical Education",
    pattern: /^physical\s+education\b/i,
    titlePrefix: /^physical\s+education\b[:\-\s]*/i,
  },
  {
    category: "Activity",
    pattern: /\bgraded\s+activity\b/i,
    titlePrefix: /^.*?\bgraded\s+activity\b[:\-\s]*/i,
  },
  {
    category: "Project",
    pattern: /\bgraded\s+project\b/i,
    titlePrefix: /^.*?\bgraded\s+project\b[:\-\s]*/i,
  },
  {
    category: "ClassTest",
    pattern: /\bclass\s*test\b/i,
    titlePrefix: /^.*?\bclass\s*test\b[:\-\s]*/i,
  },
  {
    category: "UnitTest",
    pattern: /\bunit\s*test\b/i,
    titlePrefix: /^.*?\bunit\s*test\b[:\-\s]*/i,
  },
  {
    category: "HomeStudy",
    pattern: /\brevision\b/i,
    titlePrefix: /^.*?\brevision\b[:\-\s]*/i,
  },
];

const inferCategory = (line: string) => {
  const explicitMatch = schoolKeywordRows.find((entry) =>
    entry.pattern.test(line),
  );
  if (explicitMatch) {
    return explicitMatch.category;
  }

  const match = categoryPatterns.find((entry) => entry.pattern.test(line));
  return match?.category;
};

const isCategoryHeader = (line: string) => {
  return categoryPatterns.some((entry) =>
    new RegExp(`^${entry.pattern.source}s?$`, "i").test(line.trim()),
  );
};

const isWeekHeader = (line: string) => /^week\s*\d+/i.test(line.trim());
const isCircularHeader = (line: string) => /^circular\s*\//i.test(line.trim());
const isSchoolNoteLine = (line: string) =>
  /^(?:~\s*)?(?:all\s+books|books\s+and\s+notebooks|note\b|kindly\b|parents?\b|please\s+(?:find|note)\b)|parent\s+portal|\bworking\s+day\s+for\s+grade\b/i.test(
    line.trim(),
  );
const scheduleSubjectPattern = unitTestScheduleSubjects
  .map((subject) => subject.replace(/\s+/g, "\\s+"))
  .join("|");
const weekdayPattern = new RegExp(`^${weekdayToken}$`, "i");
const isScheduleArtifactLine = (line: string) => {
  const normalized = line.trim();
  const compactDateCount = (
    normalized.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g) ?? []
  ).length;
  const shortYearTimetableDate =
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{2}\b/.test(normalized) &&
    new RegExp(`[(]${weekdayToken}[)]`, "i").test(normalized);
  const weekdaySubjectOnly = new RegExp(
    `^[(]?${weekdayToken}[)]?\\s+(?:${knownSubjects.map((subject) => subject.replace(/\s+/g, "\\s+")).join("|")})$`,
    "i",
  ).test(normalized);
  const parenthesizedScheduleSubjectOnly = new RegExp(
    `^\\d{1,2}[./-]\\d{1,2}[./-]\\d{4}\\s+[(]${weekdayToken}[)]\\s+(?:${scheduleSubjectPattern})$`,
    "i",
  ).test(normalized);

  return (
    compactDateCount > 1 ||
    shortYearTimetableDate ||
    weekdaySubjectOnly ||
    parenthesizedScheduleSubjectOnly
  );
};
const isBookScheduleLine = (line: string) => {
  const normalized = line.trim();
  const startsWithListNumber = /^\d+\s+/.test(normalized);
  if (!startsWithListNumber) {
    return false;
  }

  const explicitBookList =
    /\b(?:course\s+book|notebook|supplementry\s+reader|according\s+to\s+the\s+timetable|as\s+required|daily)\b/i.test(
      normalized,
    );
  const weekdayOnlyListItem =
    /^\d+\s+(?:monday|tuesday|wednesday|thursday|friday)(?:\s+(?:monday|tuesday|wednesday|thursday|friday))?$/i.test(
      normalized,
    );

  return explicitBookList || weekdayOnlyListItem;
};
const isUndatedScholasticTableFragment = (line: string) => {
  const normalized = line.trim();
  if (/^unit\s*test\s*portion$/i.test(normalized)) {
    return true;
  }

  if (
    /^unit\s*test\s*-?\s*i\s+exam\s+timetable$/i.test(normalized) ||
    /^revision\s*-?\s*\d+$/i.test(normalized) ||
    /class\s+test\s+and\s+portions/i.test(normalized)
  ) {
    return true;
  }

  const hasDateToken = /\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/.test(
    normalized,
  );
  if (hasDateToken) {
    return false;
  }

  const subjectChapterFragment =
    /^(?:english|hindi|mathematics|math|science|social(?:\s+science)?|kannada|computer(?:\s+science)?|gk|general\s+knowledge)\s+chapter\b/i.test(
      normalized,
    );

  return (
    /\b(?:pending\s+portions|chapter\s+name|oral\s+discussion|written\s*-|graded\s+activity.*graded\s+activity)\b/i.test(
      normalized,
    ) || subjectChapterFragment
  );
};
const shouldSkipGenericLine = (line: string) =>
  isSchoolNoteLine(line) ||
  isScheduleArtifactLine(line) ||
  isBookScheduleLine(line) ||
  isUndatedScholasticTableFragment(line);

const inferDefaultYear = (text: string, relativePath: string) => {
  const yearMatch = `${relativePath}\n${text}`.match(/\b20\d{2}\b/);
  return yearMatch?.[0] ?? dayjs().format("YYYY");
};

const buildContextualDate = (
  day: string,
  defaultMonthLabel?: string,
  defaultYear?: string,
) => {
  if (!defaultMonthLabel) {
    return undefined;
  }

  const parsed = dayjs(
    `${day} ${defaultMonthLabel} ${defaultYear ?? dayjs().format("YYYY")}`,
    "D MMMM YYYY",
    true,
  );
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }

  const shortParsed = dayjs(
    `${day} ${defaultMonthLabel} ${defaultYear ?? dayjs().format("YYYY")}`,
    "D MMM YYYY",
    true,
  );
  return shortParsed.isValid() ? shortParsed.format("YYYY-MM-DD") : undefined;
};

const extractVisibleWeekday = (line: string) =>
  line.match(new RegExp(`\\b${weekdayToken}\\b`, "i"))?.[0];

const validateVisibleWeekday = (dueDate: string, line: string) => {
  const visibleWeekday = extractVisibleWeekday(line);
  if (!visibleWeekday) {
    return undefined;
  }

  const expectedDay = weekdayIndexes[visibleWeekday.toLowerCase()];
  const actualDay = dayjs(dueDate, "YYYY-MM-DD", true).day();
  return expectedDay === actualDay ? undefined : "Date and weekday mismatch";
};

const extractDateParts = (
  line: string,
): { dateToken: string; dueDate: string; parserIssue?: string } | undefined => {
  line = line.replace(
    /(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d)\s*(\d)\s*(\d)\s*(\d)/g,
    "$1/$2/$3$4$5$6",
  );
  const dateToken =
    line.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    line.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/)?.[0] ??
    line.match(/\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/)?.[0] ??
    line.match(/\b\d{1,2}\s+[A-Za-z]+\b/)?.[0];

  if (!dateToken) {
    return undefined;
  }

  for (const pattern of datePatterns) {
    const parsed = dayjs(dateToken, pattern, true);
    if (parsed.isValid()) {
      return {
        dateToken,
        dueDate: parsed.format("YYYY-MM-DD"),
        parserIssue: validateVisibleWeekday(parsed.format("YYYY-MM-DD"), line),
      };
    }
  }

  return undefined;
};

const extractContextualDateParts = (
  line: string,
  defaultMonthLabel?: string,
  defaultYear?: string,
) => {
  const contextualToken =
    line.match(new RegExp(`^(\\d{1,2})\\s+${weekdayToken}\\b`, "i"))?.[0] ??
    line.match(new RegExp(`^${weekdayToken}\\s+(\\d{1,2})\\b`, "i"))?.[0] ??
    line.match(/^(\d{1,2})\b/)?.[0];

  const contextualDay = contextualToken?.match(/\d{1,2}/)?.[0];
  if (!contextualDay) {
    return undefined;
  }

  const dueDate = buildContextualDate(
    contextualDay,
    defaultMonthLabel,
    defaultYear,
  );
  if (!dueDate) {
    return undefined;
  }

  return {
    dateToken: contextualToken,
    dueDate,
    parserIssue: validateVisibleWeekday(dueDate, line),
  };
};

const extractDelimitedRow = (
  line: string,
  currentCategory: string | undefined,
  defaultMonthLabel?: string,
  defaultYear?: string,
) => {
  if (!/[|\t]/.test(line)) {
    return undefined;
  }

  const parts = line
    .split(/[|\t]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return undefined;
  }

  const dateParts =
    extractDateParts(parts[0]) ??
    extractContextualDateParts(parts[0], defaultMonthLabel, defaultYear);
  const category = inferCategory(parts[1]) ?? currentCategory;
  const title =
    parts.slice(2).join(" ").trim() ||
    (parts.length === 2 ? undefined : undefined);

  if (!dateParts || !category) {
    return undefined;
  }

  return {
    category,
    dateParts,
    title: title ?? cleanTitle(parts[1], category),
    description: line,
  };
};

const inferChildName = (
  text: string,
  relativePath: string,
  childAliases: string[],
) => {
  const haystack = `${relativePath}\n${text}`.toLowerCase();
  const match = [...childAliases]
    .sort((first, second) => second.length - first.length)
    .find((childName) => {
      const escapedAlias = childName
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\s+/g, "\\s+");
      return new RegExp(`(^|[^a-z0-9])${escapedAlias}([^a-z0-9]|$)`, "i").test(
        haystack,
      );
    });
  return match;
};

const extractSubjectParts = (
  title: string,
): { subject?: string; title: string } => {
  const subject = knownSubjects.find((entry) =>
    new RegExp(`^${entry.replace(/\s+/g, "\\s+")}\\b`, "i").test(title),
  );
  if (!subject) {
    return { title };
  }

  const nextTitle = title
    .replace(
      new RegExp(`^${subject.replace(/\s+/g, "\\s+")}\\b[:\\s-]*`, "i"),
      "",
    )
    .trim();
  return {
    subject,
    title: nextTitle || `Study ${subject}`,
  };
};

const subjectAliases: Record<string, string> = {
  english: "English",
  math: "Mathematics",
  mathematics: "Mathematics",
  science: "Science",
  hindi: "Hindi",
  kannada: "Kannada",
  computer: "Computer Science",
  "computer science": "Computer Science",
  social: "Social Studies",
  "social studies": "Social Studies",
  gk: "General knowledge",
  general: "General knowledge",
  "general knowledge": "General knowledge",
};

const normalizeSubjectCell = (value: string) =>
  subjectAliases[normalizeText(value).toLowerCase()];

const normalizeTableSubject = (value: string) => {
  const normalized = normalizeText(value);
  const subject = normalizeSubjectCell(normalized);
  if (subject) {
    return subject;
  }

  const scheduleSubject = unitTestScheduleSubjects.find(
    (entry) => normalizeText(entry).toLowerCase() === normalized.toLowerCase(),
  );
  return scheduleSubject
    ? normalizeUnitTestSubject(scheduleSubject)
    : undefined;
};

const inferCellCategory = (value: string): string | undefined => {
  if (/\b(?:h\.?\s*w\.?|homework)\b/i.test(value)) {
    return "Homework";
  }

  if (/^\s*class\s*test\b/i.test(value)) {
    return "ClassTest";
  }

  if (/^\s*unit\s*test\b/i.test(value)) {
    return "UnitTest";
  }

  if (
    /graded\s+(?:lab\s+)?activity|graded\s+(?:speaking|listening)\s+skills?/i.test(
      value,
    )
  ) {
    return "Activity";
  }

  if (/graded\s+project/i.test(value)) {
    return "Project";
  }

  return undefined;
};

const isUnitTestDocument = (contentText: string, relativePath: string) => {
  const identity = `${relativePath}\n${contentText.slice(0, 1200)}`;
  return (
    /(?:unit[\s_-]*test|ut[\s_-]*1|exam[\s_-]*(?:circular|timetable|schedule))/i.test(
      identity,
    ) && !/scholastic\s+planner/i.test(identity)
  );
};

const normalizeQuestionText = (value: string) =>
  normalizeText(value)
    .replace(/\bQ\.?\s+/gi, "Q")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*,\s*/g, ", ")
    .trim();
const appendMatrixContext = (previous: string | undefined, next: string) => {
  const normalizedNext = normalizeText(next);
  if (!normalizedNext) {
    return previous ?? "";
  }
  if (!previous) {
    return normalizedNext;
  }
  const previousParts = previous
    .split(" • ")
    .map((part) => normalizeText(part).toLowerCase());
  if (previousParts.includes(normalizedNext.toLowerCase())) {
    return previous;
  }
  return `${previous} • ${normalizedNext}`;
};
const parseHomeworkContext = (value: string) => {
  const context = normalizeText(
    value.replace(/\s*•\s*/g, " • ").replace(/_{3,}/g, " "),
  );
  const chapterMatch = context.match(
    /\bchapter\s*[-:]?\s*(\d+(?:\s*&\s*\d+)*)\b/i,
  );
  const revisionMatch = context.match(/\brevision\s*[-:]?\s*(\d+)\b/i);
  const chapterNumber = chapterMatch?.[1]?.replace(/\s+/g, " ").trim();
  let chapterName: string | undefined;
  if (chapterMatch?.index !== undefined) {
    const chapterTail = context
      .slice(chapterMatch.index + chapterMatch[0].length)
      .replace(
        /\b(?:Q\.?\s*\d+|Oral\s+Discussion|Written\s*[-:]?|H\.?\s*W\.?)\b[\s\S]*$/i,
        "",
      )
      .replace(/\s*•\s*/g, " ")
      .trim();
    chapterName = chapterTail || undefined;
  }
  const questionMatches = Array.from(
    context.matchAll(
      /\bQ\.?\s*\d+(?:\s*[-–]\s*Q?\.?\s*\d+)?(?:\s*[,&]\s*Q?\.?\s*\d+)*/gi,
    ),
  );
  const revisionWork =
    questionMatches.length > 0
      ? normalizeQuestionText(questionMatches[questionMatches.length - 1][0])
      : undefined;
  return {
    context,
    chapterNumber,
    chapterName,
    revisionNumber: revisionMatch?.[1],
    revisionWork,
  };
};
const splitHomeworkCell = (value: string, inheritedContext = "") => {
  const match = value.match(/\b(?:h\.?\s*w\.?|homework)\b\s*[:.-]?\s*/i);
  if (!match || match.index === undefined) {
    return undefined;
  }
  const inlineContext = normalizeText(value.slice(0, match.index));
  const combinedContext = [inheritedContext, inlineContext]
    .filter(Boolean)
    .join(" • ");
  const parsedContext = parseHomeworkContext(combinedContext);
  const homework = normalizeQuestionText(
    value.slice(match.index + match[0].length),
  );
  const chapterTitle =
    parsedContext.chapterNumber && parsedContext.chapterName
      ? `Chapter ${parsedContext.chapterNumber} — ${parsedContext.chapterName}`
      : parsedContext.chapterNumber
        ? `Chapter ${parsedContext.chapterNumber}`
        : undefined;
  const title = chapterTitle ? `${chapterTitle}: ${homework}` : homework;
  const descriptionParts = [
    parsedContext.revisionNumber
      ? `Revision ${parsedContext.revisionNumber}`
      : undefined,
    parsedContext.revisionWork
      ? `Revision work: ${parsedContext.revisionWork}`
      : undefined,
    `Homework: ${homework}`,
  ].filter((part): part is string => Boolean(part));
  return {
    title,
    context: parsedContext.context,
    description: descriptionParts.join(" • "),
  };
};

const normalizeBrokenBrackets = (value: string) => {
  const text = normalizeText(value);

  const openCount = (text.match(/\(/g) ?? []).length;
  const closeCount = (text.match(/\)/g) ?? []).length;

  if (openCount > closeCount) {
    return `${text}${")".repeat(openCount - closeCount)}`;
  }

  return text;
};

const cleanTitleFragment = (value: string) =>
  normalizeBrokenBrackets(
    normalizeText(value)
      .replace(/^\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\s*/, "")
      .replace(/^[({[]\s*/, "")
      .replace(/\s*[)}\]]$/, "")
      .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "")
      .trim(),
  );

const cleanCellTitle = (value: string, category: string) => {
  const cleaned = cleanTitleFragment(
    value
      .replace(/\bclass\s*test\b[:\s-]*/i, "")
      .replace(/\bunit\s*test\s*-?\s*1\b[:\s-]*/i, "")
      .replace(/\bunit\s*test\b[:\s-]*/i, "")
      .replace(/\but\s*-?\s*1\b[:\s-]*/i, "")
      .replace(/\bgraded\s+lab\s+activity\b[:\s-]*/i, "")
      .replace(/\bgraded\s+activity\b[:\s-]*/i, "")
      .replace(/\bgraded\s+project\b[:\s-]*/i, ""),
  );

  if (cleaned) {
    if (category === "UnitTest" && /^(?:1|i)$/i.test(cleaned)) {
      return "Unit Test";
    }

    return cleaned;
  }

  if (category === "ClassTest") {
    return "Class Test";
  }

  if (category === "UnitTest") {
    return "Unit Test";
  }

  if (category === "Activity") {
    return "Activity";
  }

  if (category === "Project") {
    return "Project";
  }

  return "Study work";
};

const isWeakProjectTitle = (title: string) => {
  const normalizedTitle = normalizeText(title).toLowerCase();

  return (
    normalizedTitle === "project" ||
    title.length < 3 ||
    /^[()[\]{}]+$/.test(title.trim()) ||
    !/[a-z0-9]/i.test(title)
  );
};

const isWeakMatrixTitle = (title: string, category: string) => {
  const normalizedTitle = title.trim().toLowerCase();
  return (
    normalizedTitle === "activity" ||
    normalizedTitle === "project" ||
    normalizedTitle === category.toLowerCase() ||
    /^[({[]/.test(title)
  );
};

const isUsefulMatrixContext = (value: string) => {
  const cleaned = cleanTitleFragment(value);
  return (
    Boolean(cleaned) &&
    !/^_{3,}$/.test(cleaned) &&
    !shouldSkipGenericLine(cleaned)
  );
};

const isSafeMatrixContinuation = (value: string) => {
  const cleaned = cleanTitleFragment(value);
  return (
    Boolean(cleaned) &&
    cleaned.length <= 90 &&
    !/\b(?:JULY\s*:\s*WEEK|ACTIVITIES\s+OF\s+THE\s+MONTH|Home Study Pg|Notebook Work letter|Poem Revision)\b/i.test(
      cleaned,
    )
  );
};

const buildMatrixTitle = (
  cell: string,
  category: string,
  contexts: string[] = [],
) => {
  const cleanedTitle = cleanCellTitle(cell, category);
  if (!isWeakMatrixTitle(cleanedTitle, category)) {
    return cleanedTitle;
  }

  const cleanedContext =
    category === "Project" ? contexts.find(isUsefulMatrixContext) : undefined;
  if (!cleanedContext) {
    return cleanedTitle;
  }

  const cleanedContextTitle = cleanTitleFragment(cleanedContext);

  if (!cleanedContextTitle || !/[a-z0-9]/i.test(cleanedContextTitle)) {
    return cleanedTitle;
  }

  return `${cleanedContextTitle} ${
    category === "Project" ? "Project" : "Activity"
  }`;
};

const isScholasticMatrixArtifactLine = (line: string) => {
  const normalized = normalizeText(line);
  return (
    /\b(?:VYDEHI\s+SCHOOL\s+OF\s+EXCELLENCE|SCHOLASTIC\s+PLANNER|CLASS\s*-\s*[IVX]+|SUBJECT\s*&\s*WEEK|Thought\s+of\s+the\s+day|Etiquette\s+of\s+the\s+month|Poem\s+of\s+the\s+month|Story\s+of\s+the\s+month|BOOKS\s+TO\s+BE\s+BROUGHT|BOOKS\s+SENT\s+BACK|DATE\s*&\s*DAY|CLASS\s+TEST\s+AND\s+PORTIONS)\b/i.test(
      normalized,
    ) || /\bworking\s+day\s+for\s+grade\b/i.test(normalized)
  );
};

const extractScholasticMatrixRows = (
  contentText: string,
  childName: string | undefined,
  options: { allowUnitTestRows?: boolean } = {},
): RawImportRecord[] => {
  const lines = contentText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const dateHeaderIndex = lines.findIndex((line) => {
    if (!line.includes("\t")) {
      return false;
    }

    const dateCount = line
      .split("\t")
      .filter((cell) => extractDateParts(cell)).length;
    return (
      dateCount >= 2 || (/subject\s*&\s*week/i.test(line) && dateCount >= 1)
    );
  });
  if (dateHeaderIndex < 0) {
    return [];
  }

  let dateCells = lines[dateHeaderIndex]
    .split("\t")
    .map((cell) => extractDateParts(cell));
  const records = new Map<string, RawImportRecord & { titleParts: string[] }>();
  const activeCategoryByCell = new Map<string, string>();
  const contextByCell = new Map<string, string>();
  const contextBySubject = new Map<string, string>();
  let currentSubject: string | undefined;

  lines.slice(dateHeaderIndex + 1).forEach((line) => {
    if (line.includes("\t")) {
      const nextDateCells = line
        .split("\t")
        .map((cell) => extractDateParts(cell));
      if (nextDateCells.filter(Boolean).length >= 2) {
        dateCells = nextDateCells;
        currentSubject = undefined;
        return;
      }
    }

    const standaloneSubject = normalizeSubjectCell(line);
    if (standaloneSubject) {
      currentSubject = standaloneSubject;
      return;
    }

    if (!line.includes("\t")) {
      return;
    }

    if (isScholasticMatrixArtifactLine(line)) {
      return;
    }

    const cells = line.split("\t");
    const subject = normalizeSubjectCell(cells[0] ?? "");
    if (subject) {
      currentSubject = subject;
    } else if ((cells[0] ?? "").trim()) {
      return;
    }

    if (!currentSubject) {
      return;
    }

    const subjectForRow = currentSubject;

    dateCells.forEach((dateParts, columnIndex) => {
      if (!dateParts || columnIndex === 0) {
        return;
      }

      const cell = normalizeText(cells[columnIndex] ?? "");
      if (!cell || shouldSkipGenericLine(cell)) {
        return;
      }

      const cellKey = `${currentSubject}__${dateParts.dueDate}`;
      const explicitCategory = inferCellCategory(cell);
      if (explicitCategory === "UnitTest" && !options.allowUnitTestRows) {
        return;
      }

      const activeCategory = activeCategoryByCell.get(cellKey);
      if (
        !explicitCategory &&
        activeCategory &&
        !isSafeMatrixContinuation(cell)
      ) {
        return;
      }

      const category = explicitCategory ?? activeCategory;

      if (!category) {
        if (activeCategory) {
          const activeRecordKey = `${cellKey}__${activeCategory}`;
          const existing = records.get(activeRecordKey);
          if (existing) {
            const titlePart = cleanTitleFragment(cell);

            existing.titleParts.push(titlePart);
            existing.title = existing.titleParts
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
            existing.description = `${existing.description} ${cell}`.trim();
          }
        }

        contextByCell.set(
          cellKey,
          appendMatrixContext(contextByCell.get(cellKey), cell),
        );
        if (isUsefulMatrixContext(cell)) {
          contextBySubject.set(
            subjectForRow,
            appendMatrixContext(contextBySubject.get(subjectForRow), cell),
          );
        }
        return;
      }

      if (explicitCategory) {
        activeCategoryByCell.set(cellKey, category);
      }
      const recordKey = `${cellKey}__${category}`;
      const homeworkParts =
        category === "Homework"
          ? splitHomeworkCell(cell, contextByCell.get(cellKey) ?? "")
          : undefined;
      const titlePart =
        homeworkParts?.title ||
        buildMatrixTitle(cell, category, [
          contextByCell.get(cellKey) ?? "",
          contextBySubject.get(subjectForRow) ?? "",
        ]);

      if (category === "Project" && isWeakProjectTitle(titlePart)) {
        return;
      }

      const descriptionPart = homeworkParts?.description ?? cell;

      const existing = records.get(recordKey);
      if (existing) {
        existing.titleParts.push(titlePart);
        existing.title = existing.titleParts
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        existing.description =
          `${existing.description} ${descriptionPart}`.trim();
        return;
      }

      records.set(recordKey, {
        childName,
        category,
        subject: currentSubject,
        title: titlePart,
        titleParts: [titlePart],
        dueDate: dateParts.dueDate,
        description: descriptionPart,
        parserIssue: dateParts.parserIssue,
      });
    });
  });

  return Array.from(records.values()).map(
    ({ titleParts: _titleParts, ...row }) => {
      if (
        row.category === "Activity" &&
        row.title &&
        isWeakMatrixTitle(row.title, row.category) &&
        row.subject
      ) {
        return {
          ...row,
          title: `${row.subject} ${row.category}`,
        };
      }

      return row;
    },
  );
};

type FixedTableKind = "HomeStudy" | "ClassTest" | "UnitTest";

const normalizeHeaderText = (value: string) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getFixedTableKind = (line: string): FixedTableKind | undefined => {
  const header = normalizeHeaderText(line);
  if (
    /\bs no\b/.test(header) &&
    /\bdate\b/.test(header) &&
    /\bday\b/.test(header) &&
    /\bsubject\b/.test(header) &&
    /\bhome study\b/.test(header)
  ) {
    return "HomeStudy";
  }

  if (
    /\bdate\b/.test(header) &&
    /\bday\b/.test(header) &&
    /\bsubject\b/.test(header) &&
    /\bclass test portions\b/.test(header)
  ) {
    return "ClassTest";
  }

  if (/\bdate day\b/.test(header) && /\bsubject\b/.test(header)) {
    return "UnitTest";
  }

  return undefined;
};

const isFixedTableTitle = (line: string) =>
  /\b(?:unit\s*test\s*-?\s*i\s+exam\s+timetable|class\s+test\s+and\s+portions)\b/i.test(
    normalizeText(line),
  );

const startsNewPlannerSection = (line: string) =>
  /\b(?:JULY\s*:\s*WEEK|ACTIVITIES\s+OF\s+THE\s+MONTH|SUBJECT\s+ACTIVITIES|CO\s*SCHOLASTIC|UNIT\s*TEST|CLASS\s+TEST\s+AND\s+PORTIONS)\b/i.test(
    normalizeText(line),
  );

const splitTableLine = (line: string) =>
  line.split("\t").map((cell) => normalizeText(cell));

const appendFixedTableContinuation = (
  rows: RawImportRecord[],
  line: string,
) => {
  const tail = normalizeText(
    line.replace(/^\t+/, "").split("\t").filter(Boolean).join(" "),
  );
  const lastRow = rows[rows.length - 1];
  if (!tail || !lastRow) {
    return;
  }

  lastRow.title = `${lastRow.title} ${tail}`.replace(/\s+/g, " ").trim();
  lastRow.description = `${lastRow.description} ${tail}`.trim();
};

const parseLooseSubjectAndTitle = (value: string) => {
  const normalized = normalizeText(value);
  const words = normalized.split(" ").filter(Boolean);
  for (let size = 2; size >= 1; size -= 1) {
    const subject = normalizeTableSubject(words.slice(0, size).join(" "));
    if (subject) {
      return {
        subject,
        title: words.slice(size).join(" ").trim(),
      };
    }
  }

  return { title: normalized };
};

const shouldAppendLooseHomeStudyContinuation = (
  row: RawImportRecord,
  line: string,
) => {
  if (!row.title) {
    return true;
  }

  return /^(?:pg\.?\s*no\.?|read\b|home\s*study\s+pg\.?|chapter\b)/i.test(
    normalizeText(line),
  );
};

const extractLooseHomeStudyRows = (
  contentText: string,
  childName: string | undefined,
): RawImportRecord[] => {
  const rows: RawImportRecord[] = [];
  let inHomeStudyTable = false;
  let activeRow: RawImportRecord | undefined;
  const rowPattern = new RegExp(
    `^\\d+\\s+(\\d{1,2}\\s*[./-]\\s*\\d{1,2}\\s*[./-]\\s*\\d{4})\\s+${weekdayToken}\\s+(.+)$`,
    "i",
  );

  const flushActiveRow = () => {
    if (activeRow?.title) {
      rows.push({
        ...activeRow,
        title: normalizeText(activeRow.title),
        description: normalizeText(activeRow.description ?? activeRow.title),
      });
    }
    activeRow = undefined;
  };

  contentText.split(/\r?\n/).forEach((rawLine) => {
    const line = normalizeText(rawLine);
    if (!line) {
      return;
    }

    if (getFixedTableKind(line) === "HomeStudy") {
      flushActiveRow();
      inHomeStudyTable = true;
      return;
    }

    if (!inHomeStudyTable) {
      return;
    }

    if (startsNewPlannerSection(line)) {
      flushActiveRow();
      inHomeStudyTable = false;
      return;
    }

    const rowMatch = line.match(rowPattern);
    if (rowMatch?.[1] && rowMatch[2]) {
      flushActiveRow();
      const dateParts = extractDateParts(rowMatch[1].replace(/\s+/g, ""));
      const parsed = parseLooseSubjectAndTitle(rowMatch[2]);
      if (!dateParts || !parsed.subject) {
        return;
      }

      activeRow = {
        childName,
        category: "HomeStudy",
        subject: parsed.subject,
        title: parsed.title,
        dueDate: dateParts.dueDate,
        description: parsed.title,
        parserIssue: dateParts.parserIssue,
      };
      return;
    }

    if (
      !activeRow ||
      isSchoolNoteLine(line) ||
      isScholasticMatrixArtifactLine(line)
    ) {
      return;
    }

    if (!activeRow.subject) {
      const parsed = parseLooseSubjectAndTitle(line);
      if (parsed.subject) {
        activeRow.subject = parsed.subject;
        activeRow.title = parsed.title;
        activeRow.description = parsed.title;
      }
      return;
    }

    if (!shouldAppendLooseHomeStudyContinuation(activeRow, line)) {
      return;
    }

    activeRow.title = `${activeRow.title} ${line}`.replace(/\s+/g, " ").trim();
    activeRow.description = `${activeRow.description ?? ""} ${line}`.trim();
  });

  flushActiveRow();
  return rows;
};

const mergeFixedTableRows = (rows: RawImportRecord[]) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row.category,
      row.subject ?? "",
      row.dueDate ?? "",
      normalizeText(row.title ?? "").toLowerCase(),
    ].join("__");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const extractFixedTableRows = (
  contentText: string,
  childName: string | undefined,
): RawImportRecord[] => {
  const rows: RawImportRecord[] = [];
  let currentKind: FixedTableKind | undefined;

  contentText.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      return;
    }

    const nextKind = getFixedTableKind(line);
    if (nextKind) {
      currentKind = nextKind;
      return;
    }

    if (
      !currentKind ||
      isSchoolNoteLine(line) ||
      isScholasticMatrixArtifactLine(line)
    ) {
      return;
    }

    if (startsNewPlannerSection(line)) {
      currentKind = undefined;
      return;
    }

    if (!line.includes("\t")) {
      if (currentKind !== "UnitTest" && !inferCategory(line)) {
        appendFixedTableContinuation(rows, line);
      }
      return;
    }

    const cells = splitTableLine(line);
    if (
      currentKind !== "UnitTest" &&
      !extractDateParts(cells[currentKind === "HomeStudy" ? 1 : 0] ?? "")
    ) {
      appendFixedTableContinuation(rows, line);
      return;
    }

    if (currentKind === "HomeStudy") {
      const dateParts = extractDateParts(cells[1] ?? "");
      const subject = normalizeTableSubject(cells[3] ?? "");
      const title = normalizeText(cells.slice(4).join(" "));
      if (!dateParts || !subject || !title) {
        return;
      }

      rows.push({
        childName,
        category: "HomeStudy",
        subject,
        title,
        dueDate: dateParts.dueDate,
        description: title,
        parserIssue: dateParts.parserIssue,
      });
      return;
    }

    if (currentKind === "ClassTest") {
      const dateParts = extractDateParts(cells[0] ?? "");
      const subject = normalizeTableSubject(cells[2] ?? "");
      const title = normalizeText(cells.slice(3).join(" "));
      if (!dateParts || !subject || !title) {
        return;
      }

      rows.push({
        childName,
        category: "ClassTest",
        subject,
        title,
        dueDate: dateParts.dueDate,
        description: title,
        parserIssue: dateParts.parserIssue,
      });
      return;
    }

    const dateParts = extractDateParts(cells[0] ?? "");
    const subjectCells = weekdayPattern.test(cells[1] ?? "")
      ? cells.slice(2)
      : cells.slice(1);
    const subject = normalizeTableSubject(subjectCells.join(" "));
    if (!dateParts || !subject) {
      return;
    }

    rows.push({
      childName,
      category: "UnitTest",
      subject,
      title: `${subject} Unit Test`,
      dueDate: dateParts.dueDate,
      description: line,
      parserIssue: dateParts.parserIssue,
    });
  });

  return mergeFixedTableRows([
    ...rows,
    ...extractLooseHomeStudyRows(contentText, childName),
  ]);
};

const trimTitleSeparators = (value: string) => {
  let start = 0;
  let end = value.length;

  while (
    start < end &&
    (value[start] === "-" ||
      value[start] === ":" ||
      value[start] === "|" ||
      /\s/.test(value[start]))
  ) {
    start += 1;
  }

  while (
    end > start &&
    (value[end - 1] === "-" ||
      value[end - 1] === ":" ||
      value[end - 1] === "|" ||
      /\s/.test(value[end - 1]))
  ) {
    end -= 1;
  }

  return value.slice(start, end);
};

const cleanTitle = (line: string, category: string, dateToken?: string) => {
  let next = line;
  if (dateToken) {
    next = next.replace(dateToken, "");
  }

  next = next.replace(
    new RegExp(category.replace(/([A-Z])/g, " $1").trim(), "i"),
    "",
  );
  return trimTitleSeparators(next).trim();
};

const extractExplicitSchoolKeywordRow = (
  line: string,
  childName: string | undefined,
  defaultMonthLabel?: string,
  defaultYear?: string,
): RawImportRecord | undefined => {
  const match = schoolKeywordRows.find((entry) => entry.pattern.test(line));
  if (!match) {
    return undefined;
  }

  if (
    match.category === "UnitTest" &&
    /^unit\s*test\b[\s\-:i0-9().]*$/i.test(line.trim())
  ) {
    return undefined;
  }

  const dateParts =
    extractDateParts(line) ??
    extractContextualDateParts(line, defaultMonthLabel, defaultYear);
  const withoutDate = dateParts ? line.replace(dateParts.dateToken, "") : line;
  const rawTitle = normalizeText(
    match.titlePrefix
      ? withoutDate.replace(match.titlePrefix, "")
      : withoutDate,
  );
  const subjectParts = match.subject
    ? { subject: match.subject, title: rawTitle }
    : extractSubjectParts(rawTitle);
  const title =
    subjectParts.title ||
    (subjectParts.subject ? `Study ${subjectParts.subject}` : rawTitle);

  if (!title) {
    return undefined;
  }

  return {
    childName,
    category: match.category,
    subject: subjectParts.subject,
    title,
    dueDate: dateParts?.dueDate,
    description: line,
    parserIssue:
      dateParts?.parserIssue ??
      (!dateParts ? "Date needs confirmation" : undefined),
  };
};

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const buildDefaultDueDate = (
  defaultMonthLabel?: string,
  defaultYear?: string,
) => {
  return (
    buildContextualDate("1", defaultMonthLabel, defaultYear) ??
    dayjs().format("YYYY-MM-DD")
  );
};

const normalizeSubjectHeader = (subject: string) =>
  subject.toUpperCase().replace(/\s+/g, "\\s+").replace(/&/g, "&");

const extractSectionBetweenHeaders = (
  text: string,
  subject: string,
  subjects: string[],
) => {
  const startMatch = new RegExp(
    `\\b${normalizeSubjectHeader(subject)}\\b`,
    "i",
  ).exec(text);
  if (!startMatch) {
    return undefined;
  }

  const tail = text.slice(startMatch.index + startMatch[0].length);
  const nextIndexes = subjects
    .filter((entry) => entry !== subject)
    .map(
      (entry) =>
        new RegExp(`\\b${normalizeSubjectHeader(entry)}\\b`, "i").exec(tail)
          ?.index,
    )
    .filter(
      (index): index is number => typeof index === "number" && index >= 0,
    );
  const endIndex =
    nextIndexes.length > 0 ? Math.min(...nextIndexes) : tail.length;

  return normalizeText(tail.slice(0, endIndex));
};

const cleanExtractedSectionTitle = (value: string) => {
  return normalizeText(value)
    .replace(/\bJULY\s+\d+(?:st|nd|rd|th)?\s+WEEK\b/gi, "")
    .replace(
      /\(\d{1,2}(?:st|nd|rd|th)?\s+JULY\s+[–-]\s+\d{1,2}(?:st|nd|rd|th)?\s+JULY\)/gi,
      "",
    )
    .replace(/\bACTIVITIES\b/gi, "")
    .replace(/\bChapter\s*-?\s*\d+\s+How Things Move\b/gi, "")
    .replace(/\bSCIENCE\b$/gi, "")
    .replace(/\bChand tare\b$/gi, "")
    .replace(/\bYoko tsuki\s*=\s*side punch\b$/gi, "")
    .replace(
      /\bContemporary style\s+contemporary style\s+contemporary style\b$/gi,
      "",
    )
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "")
    .trim();
};

const isStitchedPlannerTitle = (value: string) => {
  const normalized = normalizeText(value);
  return (
    normalized.length > 120 ||
    /\bJULY\s*:\s*WEEK\b/i.test(normalized) ||
    /\bACTIVITIES\s+OF\s+THE\s+MONTH\b/i.test(normalized)
  );
};

const normalizeUnitTestSubject = (subject: string) => {
  if (/^computer$/i.test(subject)) {
    return "Computer Science";
  }

  if (/^gk$/i.test(subject)) {
    return "General knowledge";
  }

  return subject.replace(/\b\w/g, (char) => char.toUpperCase());
};

const extractCoScholasticRows = (
  contentText: string,
  childName: string | undefined,
  defaultMonthLabel?: string,
  defaultYear?: string,
): RawImportRecord[] => {
  if (!/co\s*scholastic/i.test(contentText)) {
    return [];
  }

  const dueDate = buildDefaultDueDate(defaultMonthLabel, defaultYear);
  return coScholasticSubjects.flatMap((subject) => {
    const section = extractSectionBetweenHeaders(
      contentText,
      subject,
      coScholasticSubjects,
    );
    const title = section ? cleanExtractedSectionTitle(section) : undefined;
    if (!title) {
      return [];
    }

    return [
      {
        childName,
        category: "Activity",
        subject,
        title,
        dueDate,
        description: `${subject}: ${title}`,
      },
    ];
  });
};

const extractUnitTestPortionRows = (
  contentText: string,
  childName: string | undefined,
  relativePath: string,
): RawImportRecord[] => {
  if (!isUnitTestDocument(contentText, relativePath)) {
    return [];
  }

  const documentIdentity = `${relativePath}\n${contentText.slice(0, 1200)}`;
  if (
    !/unit[\s_-]*test[\s_-]*portion/i.test(documentIdentity) ||
    !/chapter\s+name/i.test(contentText)
  ) {
    return [];
  }

  const hasSubjectSection = unitTestSubjects.some((subject) =>
    new RegExp(`\\b${subject.replace(/\s+/g, "\\s+")}\\b`, "i").test(
      contentText,
    ),
  );
  if (!hasSubjectSection) {
    return [];
  }

  return unitTestSubjects.flatMap((subject) => {
    const section = extractSectionBetweenHeaders(
      contentText,
      subject,
      unitTestSubjects,
    );
    const title = section
      ? cleanExtractedSectionTitle(section).replace(/^Literature\s+/i, "")
      : undefined;
    if (
      !title ||
      isStitchedPlannerTitle(title) ||
      /please\s+find|parent\s+portal|uploaded/i.test(title)
    ) {
      return [];
    }

    return [
      {
        childName,
        category: "UnitTest",
        subject,
        title: `Unit Test Portion: ${title}`,
        parserIssue: "Unit test portion found without an exam schedule date",
        description: `${subject}: ${title}`,
      },
    ];
  });
};

const extractUnitTestScheduleRows = (
  contentText: string,
  childName: string | undefined,
  relativePath: string,
): RawImportRecord[] => {
  if (!isUnitTestDocument(contentText, relativePath)) {
    return [];
  }

  if (
    !/unit\s*test|examination\s+schedule|exam\s+circular/i.test(contentText)
  ) {
    return [];
  }

  return contentText
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .flatMap((line) => {
      const dateParts = extractDateParts(line);
      if (!dateParts) {
        return [];
      }

      const subject = unitTestScheduleSubjects.find((entry) =>
        new RegExp(`\\b${entry.replace(/\s+/g, "\\s+")}\\b`, "i").test(line),
      );
      if (!subject) {
        return [];
      }

      const normalizedSubject = normalizeUnitTestSubject(subject);
      return [
        {
          childName,
          category: "UnitTest",
          subject: normalizedSubject,
          title: `${normalizedSubject} Unit Test`,
          dueDate: dateParts.dueDate,
          description: line,
          parserIssue: dateParts.parserIssue,
        },
      ];
    });
};

const extractScholasticActivityRows = (
  contentText: string,
  childName: string | undefined,
  relativePath: string,
  defaultMonthLabel?: string,
  defaultYear?: string,
): RawImportRecord[] => {
  if (isUnitTestDocument(contentText, relativePath)) {
    return [];
  }
  if (
    !/scholastic\s+planner|activities\s+of\s+the\s+month/i.test(contentText)
  ) {
    return [];
  }

  const flatText = normalizeText(contentText);
  const dueDate = buildDefaultDueDate(defaultMonthLabel, defaultYear);
  const rows: RawImportRecord[] = [];
  const labMatch = flatText.match(
    /Graded Lab activity\s*[–-]\s*([^]+?)(?=\s+Chapter\s*-?\s*\d+\s+How Things Move|\s+SCIENCE\b|\s+Graded Project\b|\s+CCA\b|$)/i,
  );
  const projectMatch = flatText.match(
    /Graded Project\s*[–-]\s*([^]+?)(?=\s+SCIENCE\b|\s+CCA\b|\s+Talk the Talk\b|$)/i,
  );
  const ccaMatch = flatText.match(
    /CCA\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s+([^]+?)(?=\s+Talk the Talk\b|$)/i,
  );
  const talkMatch = flatText.match(
    /Talk the Talk\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s+([^]+?)(?=$)/i,
  );

  if (labMatch?.[1]) {
    rows.push({
      childName,
      category: "Activity",
      subject: "Mathematics",
      title: cleanExtractedSectionTitle(labMatch[1]),
      dueDate,
      description: `Graded Lab Activity: ${cleanExtractedSectionTitle(labMatch[1])}`,
    });
  }

  if (projectMatch?.[1]) {
    rows.push({
      childName,
      category: "Project",
      subject: "Science",
      title: cleanExtractedSectionTitle(projectMatch[1]),
      dueDate,
      description: `Graded Project: ${cleanExtractedSectionTitle(projectMatch[1])}`,
    });
  }

  Array.from(
    flatText.matchAll(
      /\bGraded\s+((?:Speaking|Listening|Lab|Practical|Map|Art|Creative)\s+Skills?|Lab\s+activity)\b/gi,
    ),
  ).forEach((match) => {
    const title = cleanExtractedSectionTitle(match[0]);
    if (
      !title ||
      /lab\s+activity/i.test(title) ||
      rows.some((row) => row.category === "Activity" && row.title === title)
    ) {
      return;
    }

    rows.push({
      childName,
      category: "Activity",
      title,
      dueDate,
      description: title,
    });
  });

  Array.from(
    flatText.matchAll(/\b(?:Graded\s+)?Project\b\s*[:–-]?\s*([^.;\n]+)?/gi),
  ).forEach((match) => {
    const title = cleanExtractedSectionTitle(match[1] ?? match[0]);
    if (
      !title ||
      title === "Project" ||
      /detected|content/i.test(title) ||
      rows.some((row) => row.category === "Project") ||
      rows.some((row) => row.category === "Project" && row.title === title)
    ) {
      return;
    }

    rows.push({
      childName,
      category: "Project",
      title: title === "Project" ? "Project" : title,
      dueDate,
      description: `Project: ${title}`,
    });
  });

  [ccaMatch, talkMatch].forEach((match) => {
    if (!match?.[1] || !match[2]) {
      return;
    }

    const dateParts = extractDateParts(match[1]);
    rows.push({
      childName,
      category: "Activity",
      subject: match === ccaMatch ? "CCA" : "Talk the Talk",
      title: cleanExtractedSectionTitle(match[2]),
      dueDate: dateParts?.dueDate ?? dueDate,
      description: cleanExtractedSectionTitle(match[0]),
      parserIssue: dateParts?.parserIssue,
    });
  });

  return rows.filter((row) => Boolean(row.title));
};

export const extractPlannerRows = ({
  contentText,
  relativePath,
  childNames,
}: {
  contentText: string;
  relativePath: string;
  childNames: string[];
}): RawImportRecord[] => {
  const inferredChildName = inferChildName(
    contentText,
    relativePath,
    childNames,
  );
  const defaultMonthLabel = extractMonthLabel(relativePath, contentText);
  const defaultYear = inferDefaultYear(contentText, relativePath);
  const unitTestDocument = isUnitTestDocument(contentText, relativePath);
  const tableRows = extractScholasticMatrixRows(
    contentText,
    inferredChildName,
    { allowUnitTestRows: unitTestDocument },
  );
  const fixedTableRows = extractFixedTableRows(contentText, inferredChildName);
  const supplementalRows = [
    ...extractCoScholasticRows(
      contentText,
      inferredChildName,
      defaultMonthLabel,
      defaultYear,
    ),
    ...extractUnitTestPortionRows(contentText, inferredChildName, relativePath),
    ...(fixedTableRows.some((row) => row.category === "UnitTest")
      ? []
      : extractUnitTestScheduleRows(
          contentText,
          inferredChildName,
          relativePath,
        )),
    ...extractScholasticActivityRows(
      contentText,
      inferredChildName,
      relativePath,
      defaultMonthLabel,
      defaultYear,
    ),
  ];
  const structuredRows = [...fixedTableRows, ...tableRows, ...supplementalRows];

  if (structuredRows.length > 0) {
    return structuredRows;
  }

  if (unitTestDocument) {
    return [];
  }

  const genericRows = contentText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .reduce<{ records: RawImportRecord[]; currentCategory?: string }>(
      (state, line) => {
        if (shouldSkipGenericLine(line)) {
          return state;
        }

        if (
          fixedTableRows.length > 0 &&
          (getFixedTableKind(line) || isFixedTableTitle(line))
        ) {
          return state;
        }

        if (
          (tableRows.length > 0 || fixedTableRows.length > 0) &&
          line.includes("\t")
        ) {
          return state;
        }

        if (isWeekHeader(line)) {
          return state;
        }

        if (isCircularHeader(line)) {
          return state;
        }

        if (isCategoryHeader(line)) {
          return {
            ...state,
            currentCategory: inferCategory(line),
          };
        }

        const delimitedRow = extractDelimitedRow(
          line,
          state.currentCategory,
          defaultMonthLabel,
          defaultYear,
        );
        if (delimitedRow?.title) {
          const subjectParts = extractSubjectParts(delimitedRow.title);
          state.records.push({
            childName: inferredChildName,
            category: delimitedRow.category,
            subject: subjectParts.subject,
            title: subjectParts.title,
            dueDate: delimitedRow.dateParts.dueDate,
            description: delimitedRow.description,
            parserIssue: delimitedRow.dateParts.parserIssue,
          });

          return state;
        }

        const dateParts =
          extractDateParts(line) ??
          extractContextualDateParts(line, defaultMonthLabel, defaultYear);
        const explicitRow = state.currentCategory
          ? undefined
          : extractExplicitSchoolKeywordRow(
              line,
              inferredChildName,
              defaultMonthLabel,
              defaultYear,
            );
        if (explicitRow) {
          state.records.push(explicitRow);
          return state;
        }

        const category = state.currentCategory ?? inferCategory(line);
        if (!category || !dateParts) {
          return state;
        }

        const title = cleanTitle(line, category, dateParts.dateToken);
        if (!title) {
          return state;
        }

        const subjectParts = extractSubjectParts(title);

        state.records.push({
          childName: inferredChildName,
          category,
          subject: subjectParts.subject,
          title: subjectParts.title,
          dueDate: dateParts.dueDate,
          description: line,
          parserIssue: dateParts.parserIssue,
        });

        return state;
      },
      { records: [] },
    ).records;

  return genericRows;
};
