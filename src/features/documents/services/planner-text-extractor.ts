import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { RawImportRecord } from '@/features/import';
import { extractMonthLabel } from '@/features/documents/services/month-extractor';
import { extractActivityRows } from '@/features/documents/services/activity-extractor';
import {
  extractFixedTableRows,
  isFixedTableLikeLine,
} from '@/features/documents/services/fixed-table-extractor';

dayjs.extend(customParseFormat);

const categoryPatterns: Array<{ category: string; pattern: RegExp }> = [
  {
    category: 'Homework',
    pattern: /\b(?:h\.?\s*w\.?|home\s*work|homework)\b/i,
  },
  {
    category: 'ClassTest',
    pattern: /\bclass\s*test\b/i,
  },
  {
    category: 'UnitTest',
    pattern: /\bunit\s*test\b/i,
  },
  {
    category: 'Activity',
    pattern:
      /\b(?:graded\s+)?(?:lab\s+activity|creative\s+activity|activity|activities|dance|music|yoga|karate|art\s*&\s*craft|physical\s+education|cca|talk\s+the\s+talk)\b/i,
  },
  {
    category: 'Project',
    pattern: /\b(?:graded\s+)?project\b/i,
  },
  {
    category: 'Exam',
    pattern: /\bexam\b/i,
  },
  {
    category: 'HomeStudy',
    pattern: /\bhome\s*study\b|\bhomestudy\b/i,
  },
  {
    category: 'Circular',
    pattern: /\bcircular\b/i,
  },
];

const datePatterns = [
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'D-M-YYYY',
  'DD-MM-YY',
  'D-M-YY',
  'DD/MM/YYYY',
  'D/M/YYYY',
  'DD/MM/YY',
  'D/M/YY',
  'DD.MM.YYYY',
  'D.M.YYYY',
  'DD.MM.YY',
  'D.M.YY',
  'DD MMM YYYY',
  'D MMM YYYY',
  'DD MMMM YYYY',
  'D MMMM YYYY',
  'DD MMM',
  'D MMM',
  'DD MMMM',
  'D MMMM',
];

const weekdayToken =
  '(?:mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)';
const monthNameToken =
  '(?:JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)';
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
  'Math',
  'Mathematics',
  'English',
  'Hindi',
  'Science',
  'Social',
  'Social Science',
  'EVS',
  'Computer',
  'Computer Science',
  'General knowledge',
  'GK',
  'Art',
  'Dance',
  'Kannada',
  'Music',
];

const coScholasticSubjects = [
  'Physical Education',
  'Dance',
  'Art & Craft',
  'Karate',
  'Music',
  'Yoga',
];
const unitTestSubjects = [
  'English',
  'Hindi',
  'Mathematics',
  'Science',
  'Computer Science',
  'General knowledge',
  'Kannada',
];
const unitTestScheduleSubjects = [
  'Computer',
  'Computer Science',
  'Mathematics',
  'Hindi',
  'Science',
  'Kannada',
  'Social Studies',
  'English',
  'GK',
];

const schoolKeywordRows: Array<{
  category: string;
  subject?: string;
  pattern: RegExp;
  titlePrefix?: RegExp;
}> = [
  {
    category: 'Activity',
    subject: 'Dance',
    pattern: /^dance\b/i,
    titlePrefix: /^dance\b[:\-\s]*/i,
  },
  {
    category: 'Activity',
    subject: 'Music',
    pattern: /^music\b/i,
    titlePrefix: /^music\b[:\-\s]*/i,
  },
  {
    category: 'Activity',
    subject: 'Yoga',
    pattern: /^yoga\b/i,
    titlePrefix: /^yoga\b[:\-\s]*/i,
  },
  {
    category: 'Activity',
    subject: 'Karate',
    pattern: /^karate\b/i,
    titlePrefix: /^karate\b[:\-\s]*/i,
  },
  {
    category: 'Activity',
    subject: 'Art & Craft',
    pattern: /^art\s*&\s*craft\b/i,
    titlePrefix: /^art\s*&\s*craft\b[:\-\s]*/i,
  },
  {
    category: 'Activity',
    subject: 'Physical Education',
    pattern: /^physical\s+education\b/i,
    titlePrefix: /^physical\s+education\b[:\-\s]*/i,
  },
  {
    category: 'Activity',
    pattern: /\bgraded\s+activity\b/i,
    titlePrefix: /^.*?\bgraded\s+activity\b[:\-\s]*/i,
  },
  {
    category: 'Project',
    pattern: /\bgraded\s+project\b/i,
    titlePrefix: /^.*?\bgraded\s+project\b[:\-\s]*/i,
  },
  {
    category: 'ClassTest',
    pattern: /\bclass\s*test\b/i,
    titlePrefix: /^.*?\bclass\s*test\b[:\-\s]*/i,
  },
  {
    category: 'UnitTest',
    pattern: /\bunit\s*test\b/i,
    titlePrefix: /^.*?\bunit\s*test\b[:\-\s]*/i,
  },
  {
    category: 'HomeStudy',
    pattern: /\brevision\b/i,
    titlePrefix: /^.*?\brevision\b[:\-\s]*/i,
  },
];

const inferCategory = (line: string) => {
  const explicitMatch = schoolKeywordRows.find((entry) => entry.pattern.test(line));
  if (explicitMatch) {
    return explicitMatch.category;
  }

  const match = categoryPatterns.find((entry) => entry.pattern.test(line));
  return match?.category;
};

const isCategoryHeader = (line: string) => {
  return categoryPatterns.some((entry) =>
    new RegExp(`^${entry.pattern.source}s?$`, 'i').test(line.trim())
  );
};

const isWeekHeader = (line: string) => /^week\s*\d+/i.test(line.trim());
const isCircularHeader = (line: string) => /^circular\s*\//i.test(line.trim());
const isSchoolNoteLine = (line: string) =>
  /^(?:~\s*)?(?:all\s+books|books\s+and\s+notebooks|note\b|kindly\b|parents?\b|please\s+(?:find|note)\b)|parent\s+portal|\bworking\s+day\s+for\s+grade\b/i.test(
    line.trim()
  );
const scheduleSubjectPattern = unitTestScheduleSubjects
  .map((subject) => subject.replace(/\s+/g, '\\s+'))
  .join('|');
const isScheduleArtifactLine = (line: string) => {
  const normalized = line.trim();
  const compactDateCount = (normalized.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g) ?? []).length;
  const shortYearTimetableDate =
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{2}\b/.test(normalized) &&
    new RegExp(`[(]${weekdayToken}[)]`, 'i').test(normalized);
  const weekdaySubjectOnly = new RegExp(
    `^[(]?${weekdayToken}[)]?\\s+(?:${knownSubjects.map((subject) => subject.replace(/\s+/g, '\\s+')).join('|')})$`,
    'i'
  ).test(normalized);
  const parenthesizedScheduleSubjectOnly = new RegExp(
    `^\\d{1,2}[./-]\\d{1,2}[./-]\\d{4}\\s+[(]${weekdayToken}[)]\\s+(?:${scheduleSubjectPattern})$`,
    'i'
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
      normalized
    );
  const weekdayOnlyListItem =
    /^\d+\s+(?:monday|tuesday|wednesday|thursday|friday)(?:\s+(?:monday|tuesday|wednesday|thursday|friday))?$/i.test(
      normalized
    );

  return explicitBookList || weekdayOnlyListItem;
};
const isUndatedScholasticTableFragment = (line: string) => {
  const normalized = line.trim();
  if (/^unit\s*test\s*portion$/i.test(normalized)) {
    return true;
  }

  if (
    /^unit\s*test\s*[-–]?\s*i\s+exam\s+timetable$/i.test(normalized) ||
    /^revision\s*-?\s*\d+$/i.test(normalized) ||
    /class\s+test\s+and\s+portions/i.test(normalized)
  ) {
    return true;
  }

  const hasDateToken = /\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/.test(normalized);
  if (hasDateToken) {
    return false;
  }

  const subjectChapterFragment =
    /^(?:english|hindi|mathematics|math|science|social(?:\s+science)?|kannada|computer(?:\s+science)?|gk|general\s+knowledge)\s+chapter\b/i.test(
      normalized
    );

  return (
    /\b(?:pending\s+portions|chapter\s+name|oral\s+discussion|written\s*-|graded\s+activity.*graded\s+activity)\b/i.test(
      normalized
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
  return yearMatch?.[0] ?? dayjs().format('YYYY');
};

const buildContextualDate = (day: string, defaultMonthLabel?: string, defaultYear?: string) => {
  if (!defaultMonthLabel) {
    return undefined;
  }

  const parsed = dayjs(
    `${day} ${defaultMonthLabel} ${defaultYear ?? dayjs().format('YYYY')}`,
    'D MMMM YYYY',
    true
  );
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }

  const shortParsed = dayjs(
    `${day} ${defaultMonthLabel} ${defaultYear ?? dayjs().format('YYYY')}`,
    'D MMM YYYY',
    true
  );
  return shortParsed.isValid() ? shortParsed.format('YYYY-MM-DD') : undefined;
};

const extractVisibleWeekday = (line: string) =>
  line.match(new RegExp(`\\b${weekdayToken}\\b`, 'i'))?.[0];

const validateVisibleWeekday = (dueDate: string, line: string) => {
  const visibleWeekday = extractVisibleWeekday(line);
  if (!visibleWeekday) {
    return undefined;
  }

  const expectedDay = weekdayIndexes[visibleWeekday.toLowerCase()];
  const actualDay = dayjs(dueDate, 'YYYY-MM-DD', true).day();
  return expectedDay === actualDay ? undefined : 'Date and weekday mismatch';
};

const extractDateParts = (
  line: string
): { dateToken: string; dueDate: string; parserIssue?: string } | undefined => {
  line = line
    .replace(/\b(\d)\s+(\d)(?=\s*[./-])/g, '$1$2')
    .replace(
      /(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d)\s*(\d)\s*(\d)\s*(\d)/g,
      '$1/$2/$3$4$5$6'
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
        dueDate: parsed.format('YYYY-MM-DD'),
        parserIssue: validateVisibleWeekday(parsed.format('YYYY-MM-DD'), line),
      };
    }
  }

  return undefined;
};

const extractContextualDateParts = (
  line: string,
  defaultMonthLabel?: string,
  defaultYear?: string
) => {
  const contextualToken =
    line.match(new RegExp(`^(\\d{1,2})\\s+${weekdayToken}\\b`, 'i'))?.[0] ??
    line.match(new RegExp(`^${weekdayToken}\\s+(\\d{1,2})\\b`, 'i'))?.[0] ??
    line.match(/^(\d{1,2})\b/)?.[0];

  const contextualDay = contextualToken?.match(/\d{1,2}/)?.[0];
  if (!contextualDay) {
    return undefined;
  }

  const dueDate = buildContextualDate(contextualDay, defaultMonthLabel, defaultYear);
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
  defaultYear?: string
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
  const title = parts.slice(2).join(' ').trim() || (parts.length === 2 ? undefined : undefined);

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

const inferChildName = (text: string, relativePath: string, childAliases: string[]) => {
  const haystack = `${relativePath}\n${text}`.toLowerCase();
  const match = [...childAliases]
    .sort((first, second) => second.length - first.length)
    .find((childName) => {
      const escapedAlias = childName
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+');
      return new RegExp(`(^|[^a-z0-9])${escapedAlias}([^a-z0-9]|$)`, 'i').test(haystack);
    });
  return match;
};

const extractSubjectParts = (title: string): { subject?: string; title: string } => {
  const subject = knownSubjects.find((entry) =>
    new RegExp(`^${entry.replace(/\s+/g, '\\s+')}\\b`, 'i').test(title)
  );
  if (!subject) {
    return { title };
  }

  const nextTitle = title
    .replace(new RegExp(`^${subject.replace(/\s+/g, '\\s+')}\\b[:\\s-]*`, 'i'), '')
    .trim();
  return {
    subject,
    title: nextTitle || `Study ${subject}`,
  };
};

const subjectAliases: Record<string, string> = {
  english: 'English',
  math: 'Mathematics',
  mathematics: 'Mathematics',
  science: 'Science',
  hindi: 'Hindi',
  kannada: 'Kannada',
  computer: 'Computer Science',
  'computer science': 'Computer Science',
  social: 'Social Studies',
  socialstudies: 'Social Studies',
  'social studies': 'Social Studies',
  gk: 'General knowledge',
  general: 'General knowledge',
  'general knowledge': 'General knowledge',
};

const normalizeSubjectCell = (value: string) => subjectAliases[normalizeText(value).toLowerCase()];

const normalizeTableSubject = (value: string) => {
  const normalized = normalizeText(value);
  const subject = normalizeSubjectCell(normalized);
  if (subject) {
    return subject;
  }

  const scheduleSubject = unitTestScheduleSubjects.find(
    (entry) => normalizeText(entry).toLowerCase() === normalized.toLowerCase()
  );
  return scheduleSubject ? normalizeUnitTestSubject(scheduleSubject) : undefined;
};

const inferCellCategory = (value: string): string | undefined => {
  if (/\b(?:h\.?\s*w\.?|homework)\b/i.test(value)) {
    return 'Homework';
  }

  if (/\bhome\s*study\b|\bhomestudy\b/i.test(value)) {
    return 'HomeStudy';
  }

  if (/^\s*class\s*test\b/i.test(value)) {
    return 'ClassTest';
  }

  if (/^\s*unit\s*test\b/i.test(value)) {
    return 'UnitTest';
  }

  if (
    /graded\s+(?:lab|creative\s+)?activity|graded\s+(?:speaking|listening)\s+skills?/i.test(value)
  ) {
    return 'Activity';
  }

  if (/graded\s+project/i.test(value)) {
    return 'Project';
  }

  return undefined;
};

const isUnitTestDocument = (contentText: string, relativePath: string) => {
  const identity = `${relativePath}\n${contentText.slice(0, 1200)}`;
  return (
    /(?:unit[\s_-]*test|ut[\s_-]*1|exam[\s_-]*(?:circular|timetable|schedule))/i.test(identity) &&
    !/scholastic\s+planner/i.test(identity)
  );
};

const normalizeQuestionText = (value: string) =>
  normalizeText(value)
    .replace(/\bQ\.?\s+/gi, 'Q')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*,\s*/g, ', ')
    .trim();
const appendMatrixContext = (previous: string | undefined, next: string) => {
  const normalizedNext = normalizeText(next);
  if (!normalizedNext) {
    return previous ?? '';
  }
  if (!previous) {
    return normalizedNext;
  }
  const previousParts = previous.split(' • ').map((part) => normalizeText(part).toLowerCase());
  if (previousParts.includes(normalizedNext.toLowerCase())) {
    return previous;
  }
  return `${previous} • ${normalizedNext}`;
};
const parseHomeworkContext = (value: string) => {
  const context = normalizeText(value.replace(/\s*•\s*/g, ' • ').replace(/_{3,}/g, ' '));
  const chapterMatch = context.match(/\bchapter\s*[-:]?\s*(\d+(?:\s*&\s*\d+)*)\b/i);
  const revisionMatch = context.match(/\brevision\s*[-:]?\s*(\d+)\b/i);
  const chapterNumber = chapterMatch?.[1]?.replace(/\s+/g, ' ').trim();
  let chapterName: string | undefined;
  if (chapterMatch?.index !== undefined) {
    const chapterTail = context
      .slice(chapterMatch.index + chapterMatch[0].length)
      .replace(/\b(?:Q\.?\s*\d+|Oral\s+Discussion|Written\s*[-:]?|H\.?\s*W\.?)\b[\s\S]*$/i, '')
      .replace(/\s*•\s*/g, ' ')
      .trim();
    chapterName = chapterTail || undefined;
  }
  const questionMatches = Array.from(
    context.matchAll(/\bQ\.?\s*\d+(?:\s*[-–]\s*Q?\.?\s*\d+)?(?:\s*[,&]\s*Q?\.?\s*\d+)*/gi)
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
const splitHomeworkCell = (value: string, inheritedContext = '') => {
  const match = value.match(/\b(?:h\.?\s*w\.?|homework)\b\s*[:.-]?\s*/i);
  if (!match || match.index === undefined) {
    return undefined;
  }
  const inlineContext = normalizeText(value.slice(0, match.index));
  const combinedContext = [inheritedContext, inlineContext].filter(Boolean).join(' • ');
  const parsedContext = parseHomeworkContext(combinedContext);
  const homework = normalizeQuestionText(value.slice(match.index + match[0].length));
  const chapterTitle =
    parsedContext.chapterNumber && parsedContext.chapterName
      ? `Chapter ${parsedContext.chapterNumber} — ${parsedContext.chapterName}`
      : parsedContext.chapterNumber
        ? `Chapter ${parsedContext.chapterNumber}`
        : undefined;
  const title = chapterTitle ? `${chapterTitle}: ${homework}` : homework;
  const descriptionParts = [
    parsedContext.revisionNumber ? `Revision ${parsedContext.revisionNumber}` : undefined,
    parsedContext.revisionWork ? `Revision work: ${parsedContext.revisionWork}` : undefined,
    `Homework: ${homework}`,
  ].filter((part): part is string => Boolean(part));
  return {
    title,
    context: parsedContext.context,
    description: descriptionParts.join(' • '),
  };
};

const normalizeBrokenBrackets = (value: string) => {
  const text = normalizeText(value);

  const openCount = (text.match(/\(/g) ?? []).length;
  const closeCount = (text.match(/\)/g) ?? []).length;

  if (openCount > closeCount) {
    return `${text}${')'.repeat(openCount - closeCount)}`;
  }

  return text;
};

const cleanTitleFragment = (value: string) =>
  normalizeBrokenBrackets(
    normalizeText(value)
      .replace(/^\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\s*/, '')
      .replace(/^[({[]\s*/, '')
      .replace(/\s*[)}\]]$/, '')
      .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, '')
      .trim()
  );

const cleanCellTitle = (value: string, category: string) => {
  const cleaned = cleanTitleFragment(
    value
      .replace(/\bclass\s*test\b[:\s-]*/i, '')
      .replace(/\bunit\s*test\s*-?\s*1\b[:\s-]*/i, '')
      .replace(/\bunit\s*test\b[:\s-]*/i, '')
      .replace(/\but\s*-?\s*1\b[:\s-]*/i, '')
      .replace(/\bgraded\s+lab\s+activity\b[:\s-]*/i, '')
      .replace(/\bgraded\s+activity\b[:\s-]*/i, '')
      .replace(/\bgraded\s+project\b[:\s-]*/i, '')
  );

  if (cleaned) {
    if (category === 'UnitTest' && /^(?:1|i)$/i.test(cleaned)) {
      return 'Unit Test';
    }

    return cleaned;
  }

  if (category === 'ClassTest') {
    return 'Class Test';
  }

  if (category === 'UnitTest') {
    return 'Unit Test';
  }

  if (category === 'Activity') {
    return 'Activity';
  }

  if (category === 'Project') {
    return 'Project';
  }

  return 'Study work';
};

const isWeakProjectTitle = (title: string) => {
  const normalizedTitle = normalizeText(title).toLowerCase();

  return (
    normalizedTitle === 'project' ||
    title.length < 3 ||
    /^[()[\]{}]+$/.test(title.trim()) ||
    !/[a-z0-9]/i.test(title)
  );
};

const isWeakMatrixTitle = (title: string, category: string) => {
  const normalizedTitle = title.trim().toLowerCase();
  return (
    normalizedTitle === 'activity' ||
    normalizedTitle === 'project' ||
    normalizedTitle === category.toLowerCase() ||
    /^[({[]/.test(title)
  );
};

const isUsefulMatrixContext = (value: string) => {
  const cleaned = cleanTitleFragment(value);
  return Boolean(cleaned) && !/^_{3,}$/.test(cleaned) && !shouldSkipGenericLine(cleaned);
};

const isSafeMatrixContinuation = (value: string) => {
  const cleaned = cleanTitleFragment(value);
  return (
    Boolean(cleaned) &&
    cleaned.length <= 90 &&
    !new RegExp(
      String.raw`\(\d{1,2}(?:st|nd|rd|th)?\s+${monthNameToken}\s+[^0-9A-Z]+\s+\d{1,2}(?:st|nd|rd|th)?\s+${monthNameToken}\)`,
      'i'
    ).test(cleaned)
  );
};

const shouldAppendToClassTestTitle = (fragment: string, currentTitle?: string) => {
  const cleaned = cleanTitleFragment(fragment);
  const titleBase = currentTitle ?? '';
  if (!cleaned) {
    return false;
  }

  // Keep class-test titles concise and move syllabus-like details to description.
  if (
    /\b(?:chapter|pg\.?\s*no\.?|page\b|home\s*study|revision|course\s*book|notebook\s*work)\b/i.test(
      cleaned
    )
  ) {
    return false;
  }

  if (cleaned.length > 48) {
    return false;
  }

  return `${titleBase} ${cleaned}`.replace(/\s+/g, ' ').trim().length <= 90;
};

const buildMatrixTitle = (cell: string, category: string, contexts: string[] = []) => {
  const cleanedTitle = cleanCellTitle(cell, category);
  if (!isWeakMatrixTitle(cleanedTitle, category)) {
    return cleanedTitle;
  }

  if (category === 'Project') {
    return 'Project';
  }

  const cleanedContext = contexts.find(isUsefulMatrixContext);
  if (!cleanedContext) {
    return cleanedTitle;
  }

  const cleanedContextTitle = cleanTitleFragment(cleanedContext);

  if (!cleanedContextTitle || !/[a-z0-9]/i.test(cleanedContextTitle)) {
    return cleanedTitle;
  }

  return `${cleanedContextTitle} Activity`;
};
const isScholasticMatrixArtifactLine = (line: string) => {
  const normalized = normalizeText(line);
  return (
    /\b(?:VYDEHI\s+SCHOOL\s+OF\s+EXCELLENCE|SCHOLASTIC\s+PLANNER|CLASS\s*-\s*[IVX]+|SUBJECT\s*&\s*WEEK|Thought\s+of\s+the\s+day|Etiquette\s+of\s+the\s+month|Poem\s+of\s+the\s+month|Story\s+of\s+the\s+month|BOOKS\s+TO\s+BE\s+BROUGHT|BOOKS\s+SENT\s+BACK|DATE\s*&\s*DAY|CLASS\s+TEST\s+AND\s+PORTIONS)\b/i.test(
      normalized
    ) || /\bworking\s+day\s+for\s+grade\b/i.test(normalized)
  );
};

const extractScholasticMatrixRows = (
  contentText: string,
  childName: string | undefined,
  options: { allowUnitTestRows?: boolean } = {}
): RawImportRecord[] => {
  const lines = contentText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const dateHeaderIndex = lines.findIndex((line) => {
    if (!line.includes('\t')) {
      return false;
    }

    const dateCount = line.split('\t').filter((cell) => extractDateParts(cell)).length;
    return dateCount >= 2 || (/subject\s*&\s*week/i.test(line) && dateCount >= 1);
  });
  if (dateHeaderIndex < 0) {
    return [];
  }

  let dateCells = lines[dateHeaderIndex].split('\t').map((cell) => extractDateParts(cell));
  const records = new Map<string, RawImportRecord & { titleParts: string[] }>();
  const activeCategoryByCell = new Map<string, string>();
  const contextByCell = new Map<string, string>();
  const contextBySubject = new Map<string, string>();
  let currentSubject: string | undefined;

  lines.slice(dateHeaderIndex + 1).forEach((line) => {
    if (line.includes('\t')) {
      const nextDateCells = line.split('\t').map((cell) => extractDateParts(cell));
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

    if (!line.includes('\t')) {
      return;
    }

    if (isScholasticMatrixArtifactLine(line)) {
      return;
    }

    const cells = line.split('\t');
    const subject = normalizeSubjectCell(cells[0] ?? '');
    if (subject) {
      currentSubject = subject;
    } else if ((cells[0] ?? '').trim()) {
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

      const cell = normalizeText(cells[columnIndex] ?? '');
      if (!cell || shouldSkipGenericLine(cell)) {
        return;
      }

      const cellKey = `${currentSubject}__${dateParts.dueDate}`;
      const explicitCategory = inferCellCategory(cell);
      if (explicitCategory === 'UnitTest' && !options.allowUnitTestRows) {
        return;
      }

      const activeCategory = activeCategoryByCell.get(cellKey);
      if (!explicitCategory && activeCategory && !isSafeMatrixContinuation(cell)) {
        return;
      }

      const category = explicitCategory ?? activeCategory;

      if (!category) {
        if (activeCategory) {
          const activeRecordKey = `${cellKey}__${activeCategory}`;
          const existing = records.get(activeRecordKey);
          if (existing) {
            const titlePart = cleanTitleFragment(cell);
            const allowTitleAppend =
              activeCategory !== 'ClassTest' ||
              shouldAppendToClassTestTitle(titlePart, existing.title);

            if (allowTitleAppend) {
              existing.titleParts.push(titlePart);
              existing.title = existing.titleParts.join(' ').replace(/\s+/g, ' ').trim();
            }
            existing.description = `${existing.description} ${cell}`.trim();
          }
        }

        contextByCell.set(cellKey, appendMatrixContext(contextByCell.get(cellKey), cell));
        if (isUsefulMatrixContext(cell)) {
          contextBySubject.set(
            subjectForRow,
            appendMatrixContext(contextBySubject.get(subjectForRow), cell)
          );
        }
        return;
      }

      if (explicitCategory) {
        activeCategoryByCell.set(cellKey, category);
      }
      const recordKey = `${cellKey}__${category}`;
      const homeworkParts =
        category === 'Homework'
          ? splitHomeworkCell(cell, contextByCell.get(cellKey) ?? '')
          : undefined;
      const titlePart =
        homeworkParts?.title ||
        buildMatrixTitle(cell, category, [
          contextByCell.get(cellKey) ?? '',
          contextBySubject.get(subjectForRow) ?? '',
        ]);

      if (category === 'Project' && isWeakProjectTitle(titlePart)) {
        return;
      }

      const descriptionPart = homeworkParts?.description ?? cell;
      const isImplicitContinuation = !explicitCategory && Boolean(activeCategory);

      const existing = records.get(recordKey);
      if (existing) {
        const allowTitleAppend =
          !isImplicitContinuation ||
          category !== 'ClassTest' ||
          shouldAppendToClassTestTitle(titlePart, existing.title);

        if (allowTitleAppend) {
          existing.titleParts.push(titlePart);
          existing.title = existing.titleParts.join(' ').replace(/\s+/g, ' ').trim();
        }
        existing.description = `${existing.description} ${descriptionPart}`.trim();
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

  return Array.from(records.values()).map(({ titleParts: _titleParts, ...row }) => {
    if (
      row.category === 'Activity' &&
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
  });
};

const trimTitleSeparators = (value: string) => {
  let start = 0;
  let end = value.length;

  while (
    start < end &&
    (value[start] === '-' ||
      value[start] === ':' ||
      value[start] === '|' ||
      /\s/.test(value[start]))
  ) {
    start += 1;
  }

  while (
    end > start &&
    (value[end - 1] === '-' ||
      value[end - 1] === ':' ||
      value[end - 1] === '|' ||
      /\s/.test(value[end - 1]))
  ) {
    end -= 1;
  }

  return value.slice(start, end);
};

const cleanTitle = (line: string, category: string, dateToken?: string) => {
  let next = line;
  if (dateToken) {
    next = next.replace(dateToken, '');
  }

  next = next.replace(new RegExp(category.replace(/([A-Z])/g, ' $1').trim(), 'i'), '');
  return trimTitleSeparators(next).trim();
};

const extractExplicitSchoolKeywordRow = (
  line: string,
  childName: string | undefined,
  defaultMonthLabel?: string,
  defaultYear?: string
): RawImportRecord | undefined => {
  const match = schoolKeywordRows.find((entry) => entry.pattern.test(line));
  if (!match) {
    return undefined;
  }

  if (match.category === 'UnitTest' && /^unit\s*test\b[\s\-:i0-9().]*$/i.test(line.trim())) {
    return undefined;
  }

  const dateParts =
    extractDateParts(line) ?? extractContextualDateParts(line, defaultMonthLabel, defaultYear);
  const withoutDate = dateParts ? line.replace(dateParts.dateToken, '') : line;
  const rawTitle = normalizeText(
    match.titlePrefix ? withoutDate.replace(match.titlePrefix, '') : withoutDate
  );
  const subjectParts = match.subject
    ? { subject: match.subject, title: rawTitle }
    : extractSubjectParts(rawTitle);
  const title =
    subjectParts.title || (subjectParts.subject ? `Study ${subjectParts.subject}` : rawTitle);

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
    parserIssue: dateParts?.parserIssue ?? (!dateParts ? 'Date needs confirmation' : undefined),
  };
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const buildDefaultDueDate = (defaultMonthLabel?: string, defaultYear?: string) => {
  return buildContextualDate('1', defaultMonthLabel, defaultYear) ?? dayjs().format('YYYY-MM-DD');
};

const normalizeSubjectHeader = (subject: string) =>
  subject.toUpperCase().replace(/\s+/g, '\\s+').replace(/&/g, '&');

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const knownSubjectPattern = [...new Set([...knownSubjects, ...coScholasticSubjects])]
  .map(escapeRegex)
  .join('|');

const extractSectionBetweenHeaders = (text: string, subject: string, subjects: string[]) => {
  const startMatch = new RegExp(`\\b${normalizeSubjectHeader(subject)}\\b`, 'i').exec(text);
  if (!startMatch) {
    return undefined;
  }

  const tail = text.slice(startMatch.index + startMatch[0].length);
  const nextIndexes = subjects
    .filter((entry) => entry !== subject)
    .map((entry) => new RegExp(`\\b${normalizeSubjectHeader(entry)}\\b`, 'i').exec(tail)?.index)
    .filter((index): index is number => typeof index === 'number' && index >= 0);
  const endIndex = nextIndexes.length > 0 ? Math.min(...nextIndexes) : tail.length;

  return normalizeText(tail.slice(0, endIndex));
};

const cleanExtractedSectionTitle = (value: string) => {
  const subjectTailPattern = new RegExp(String.raw`\b(?:${knownSubjectPattern})\b$`, 'i');

  return normalizeText(value)
    .replace(new RegExp(String.raw`\b${monthNameToken}\s+\d+(?:st|nd|rd|th)?\s+WEEK\b`, 'gi'), '')
    .replace(
      new RegExp(
        String.raw`\(\d{1,2}(?:st|nd|rd|th)?\s+${monthNameToken}\s+[^0-9A-Z]+\s+\d{1,2}(?:st|nd|rd|th)?\s+${monthNameToken}\)`,
        'gi'
      ),
      ''
    )
    .replace(new RegExp(String.raw`\b${monthNameToken}\s+MONTH\b`, 'gi'), '')
    .replace(/\bSUBJECT\s+ACTIVITIES(?:\s+OF\s+THE\s+MONTH)?\b/gi, '')
    .replace(/\bACTIVITIES\s+OF\s+THE\s+MONTH\b/gi, '')
    .replace(/\bACTIVITIES\b/gi, '')
    .replace(/\b([A-Za-z][A-Za-z ]{2,40})\s+\1(?:\s+\1)+\b/gi, '$1')
    .replace(subjectTailPattern, '')
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, '')
    .trim();
};
const normalizeUnitTestSubject = (subject: string) => {
  if (/^computer$/i.test(subject)) {
    return 'Computer Science';
  }

  if (/^gk$/i.test(subject)) {
    return 'General knowledge';
  }

  return subject.replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizePortionSubject = (value: string) => {
  const normalized = normalizeText(value)
    .replace(/[.:]+$/g, '')
    .trim()
    .toLowerCase();
  if (normalized === 'sst' || normalized === 'social studies') {
    return 'Social Studies';
  }
  if (normalized === 'computer' || normalized === 'computer science') {
    return 'Computer Science';
  }
  if (normalized === 'gk' || normalized === 'general' || normalized === 'general knowledge') {
    return 'General knowledge';
  }
  return subjectAliases[normalized];
};

const extractPortionSubjectCell = (value: string) => {
  const match = normalizeText(value).match(
    /^(computer\s+science|general\s+knowledge|social\s+studies|english|hindi|mathematics|science|sst|computer|general|gk|kannada)\b(.*)$/i
  );
  if (!match?.[1]) {
    return {};
  }
  return {
    subject: normalizePortionSubject(match[1]),
    remainder: match[2]?.trim(),
  };
};
const extractUnitTestPortionRows = (
  contentText: string,
  childName: string | undefined,
  relativePath: string
): RawImportRecord[] => {
  if (!isUnitTestDocument(contentText, relativePath)) {
    return [];
  }

  const documentIdentity = relativePath + '\n' + contentText.slice(0, 1200);
  if (
    !/unit[\s_-]*test(?:[\s_-]*portion)?/i.test(documentIdentity) ||
    !/chapter\s+name/i.test(contentText) ||
    !/s\.?\s*no\b/i.test(contentText)
  ) {
    return [];
  }

  type PortionRow = {
    subject?: string;
    details: string[];
  };
  const rows: PortionRow[] = [];
  const leadingDetails: string[] = [];
  let inTable = false;
  let current: PortionRow | undefined;

  const flush = () => {
    if (current?.subject && current.details.length > 0) {
      rows.push(current);
    }
    current = undefined;
  };

  contentText.split(/\r?\n/).forEach((rawLine) => {
    const line = normalizeText(rawLine);
    if (!line) {
      return;
    }
    if (!inTable) {
      if (/s\.?\s*no\b.*subject.*chapter\s+no.*chapter\s+name/i.test(line)) {
        inTable = true;
      }
      return;
    }

    const numbered = line.match(/^(\d+)\.\s*(.*)$/);
    if (numbered) {
      const subjectText = numbered[2]?.trim() ?? '';
      const subjectCell = extractPortionSubjectCell(subjectText);
      const nextSubject = subjectCell.subject;
      const carriesPreviousChapter =
        nextSubject === 'Mathematics' ||
        nextSubject === 'Science' ||
        (nextSubject === 'General knowledge' && current?.subject === 'Computer Science');
      const carriedDetails =
        carriesPreviousChapter &&
        (current?.details.length ?? 0) > 1 &&
        current?.details.at(-1)?.match(/^Chapter\b/i)
          ? [current.details.pop()!]
          : [];
      flush();
      current = {
        subject: nextSubject,
        details: rows.length === 0 ? [...leadingDetails, ...carriedDetails] : carriedDetails,
      };
      if (subjectText && !current.subject) {
        current.details.push(subjectText);
      }
      return;
    }

    if (!current) {
      leadingDetails.push(line);
      return;
    }

    if (!current.subject) {
      const subjectCell = extractPortionSubjectCell(line);
      if (subjectCell.subject) {
        current.subject = subjectCell.subject;
        if (subjectCell.remainder) {
          current.details.push(subjectCell.remainder);
        }
        return;
      }
    }

    if (current.subject === 'Computer Science' && /^science\b/i.test(line)) {
      const remainder = line.replace(/^science\b/i, '').trim();
      if (remainder) {
        current.details.push(remainder);
      }
      return;
    }
    if (current.subject === 'General knowledge' && /^(?:knowledge|k\s+nowledge)\b/i.test(line)) {
      const remainder = line.replace(/^(?:knowledge|k\s+nowledge)\b/i, '').trim();
      if (remainder) {
        current.details.push(remainder);
      }
      return;
    }

    current.details.push(line);
  });
  flush();

  const tableRows = rows.flatMap((row) => {
    if (!row.subject) {
      return [];
    }
    const portion = normalizeText(row.details.join(' '));
    if (!portion) {
      return [];
    }
    return [
      {
        childName,
        category: 'UnitTest',
        subject: row.subject,
        title: 'Unit Test Portion: ' + portion,
        parserIssue: 'Unit test portion found without an exam schedule date',
        description: row.subject + ': ' + portion,
      },
    ];
  });
  if (tableRows.length > 0) {
    return tableRows;
  }

  return unitTestSubjects.flatMap((subject) => {
    const section = extractSectionBetweenHeaders(contentText, subject, unitTestSubjects);
    const portion = section
      ? cleanExtractedSectionTitle(section).replace(/^Literature\s+/i, '')
      : undefined;
    return portion
      ? [
          {
            childName,
            category: 'UnitTest',
            subject,
            title: 'Unit Test Portion: ' + portion,
            parserIssue: 'Unit test portion found without an exam schedule date',
            description: subject + ': ' + portion,
          },
        ]
      : [];
  });
};
const extractUnitTestScheduleRows = (
  contentText: string,
  childName: string | undefined,
  relativePath: string
): RawImportRecord[] => {
  if (!isUnitTestDocument(contentText, relativePath)) {
    return [];
  }

  if (!/unit\s*test|examination\s+schedule|exam\s+circular/i.test(contentText)) {
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
        new RegExp(`\\b${entry.replace(/\s+/g, '\\s+')}\\b`, 'i').test(line)
      );
      if (!subject) {
        return [];
      }

      const normalizedSubject = normalizeUnitTestSubject(subject);
      return [
        {
          childName,
          category: 'UnitTest',
          subject: normalizedSubject,
          title: `${normalizedSubject} Unit Test`,
          dueDate: dateParts.dueDate,
          description: line,
          parserIssue: dateParts.parserIssue,
        },
      ];
    });
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
  const inferredChildName = inferChildName(contentText, relativePath, childNames);
  const unitTestPortionRows = extractUnitTestPortionRows(
    contentText,
    inferredChildName,
    relativePath
  );
  if (unitTestPortionRows.length > 0) {
    return unitTestPortionRows;
  }
  const defaultMonthLabel = extractMonthLabel(relativePath, contentText);
  const defaultYear = inferDefaultYear(contentText, relativePath);
  const unitTestDocument = isUnitTestDocument(contentText, relativePath);
  const tableRows = extractScholasticMatrixRows(contentText, inferredChildName, {
    allowUnitTestRows: unitTestDocument,
  });
  const fixedTableRows = extractFixedTableRows(contentText, inferredChildName, {
    weekdayToken,
    monthNameToken,
    unitTestScheduleSubjects,
    normalizeText,
    normalizeTableSubject,
    normalizeUnitTestSubject,
    inferCategory,
    isSchoolNoteLine,
    isScholasticMatrixArtifactLine,
    extractDateParts,
    extractVisibleWeekday,
  });
  const fixedCategories = new Set(fixedTableRows.map((row) => row.category));
  const filteredTableRows = tableRows.filter((row) => !fixedCategories.has(row.category));
  const supplementalRows = [
    ...extractActivityRows(
      contentText,
      inferredChildName,
      relativePath,
      defaultMonthLabel,
      defaultYear,
      {
        coScholasticSubjects,
        knownSubjectPattern,
        normalizeText,
        buildDefaultDueDate,
        cleanExtractedSectionTitle,
        extractSectionBetweenHeaders,
        extractDateParts,
        isUnitTestDocument,
      }
    ),
    ...(fixedTableRows.some((row) => row.category === 'UnitTest')
      ? []
      : extractUnitTestScheduleRows(contentText, inferredChildName, relativePath)),
  ];
  const structuredRows = [...fixedTableRows, ...filteredTableRows, ...supplementalRows];

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

        if (fixedTableRows.length > 0 && isFixedTableLikeLine(line, normalizeText)) {
          return state;
        }

        if ((tableRows.length > 0 || fixedTableRows.length > 0) && line.includes('\t')) {
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
          defaultYear
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
              defaultYear
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
      { records: [] }
    ).records;

  return genericRows;
};
