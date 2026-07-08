import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { RawImportRecord } from "@/features/import";
import { extractMonthLabel } from "@/features/documents/services/month-extractor";

dayjs.extend(customParseFormat);

const categoryPatterns: Array<{ category: string; pattern: RegExp }> = [
  { category: "Homework", pattern: /\bhomework\b/i },
  { category: "ClassTest", pattern: /\bclass\s*test\b/i },
  { category: "UnitTest", pattern: /\bunit\s*test\b/i },
  { category: "Activity", pattern: /\b(?:graded\s+)?(?:activity|activities|dance|music|yoga|karate|art\s*&\s*craft|physical\s+education|cca|talk\s+the\s+talk)\b/i },
  { category: "Project", pattern: /\b(?:graded\s+)?project\b/i },
  { category: "Exam", pattern: /\bexam\b/i },
  { category: "HomeStudy", pattern: /\bhome\s*study|revision\b/i },
  { category: "Circular", pattern: /\bcircular\b/i },
];

const datePatterns = [
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "D-M-YYYY",
  "DD/MM/YYYY",
  "D/M/YYYY",
  "DD.MM.YYYY",
  "D.M.YYYY",
  "DD MMM YYYY",
  "D MMM YYYY",
  "DD MMMM YYYY",
  "D MMMM YYYY",
  "DD MMM",
  "D MMM",
  "DD MMMM",
  "D MMMM",
];

const weekdayToken = "(?:mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)";
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

const coScholasticSubjects = ["Physical Education", "Dance", "Art & Craft", "Karate", "Music", "Yoga"];
const unitTestSubjects = ["English", "Hindi", "Mathematics", "Science", "Computer Science", "General knowledge", "Kannada"];
const unitTestScheduleSubjects = ["Computer", "Mathematics", "Hindi", "Science", "Kannada", "Social Studies", "English", "GK"];

const schoolKeywordRows: Array<{ category: string; subject?: string; pattern: RegExp; titlePrefix?: RegExp }> = [
  { category: "Activity", subject: "Dance", pattern: /^dance\b/i, titlePrefix: /^dance\b[:\-\s]*/i },
  { category: "Activity", subject: "Music", pattern: /^music\b/i, titlePrefix: /^music\b[:\-\s]*/i },
  { category: "Activity", subject: "Yoga", pattern: /^yoga\b/i, titlePrefix: /^yoga\b[:\-\s]*/i },
  { category: "Activity", subject: "Karate", pattern: /^karate\b/i, titlePrefix: /^karate\b[:\-\s]*/i },
  { category: "Activity", subject: "Art & Craft", pattern: /^art\s*&\s*craft\b/i, titlePrefix: /^art\s*&\s*craft\b[:\-\s]*/i },
  { category: "Activity", subject: "Physical Education", pattern: /^physical\s+education\b/i, titlePrefix: /^physical\s+education\b[:\-\s]*/i },
  { category: "Activity", pattern: /\bgraded\s+activity\b/i, titlePrefix: /^.*?\bgraded\s+activity\b[:\-\s]*/i },
  { category: "Project", pattern: /\bgraded\s+project\b/i, titlePrefix: /^.*?\bgraded\s+project\b[:\-\s]*/i },
  { category: "ClassTest", pattern: /\bclass\s*test\b/i, titlePrefix: /^.*?\bclass\s*test\b[:\-\s]*/i },
  { category: "UnitTest", pattern: /\bunit\s*test\b/i, titlePrefix: /^.*?\bunit\s*test\b[:\-\s]*/i },
  { category: "HomeStudy", pattern: /\brevision\b/i, titlePrefix: /^.*?\brevision\b[:\-\s]*/i },
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
  return categoryPatterns.some((entry) => new RegExp(`^${entry.pattern.source}s?$`, "i").test(line.trim()));
};

const isWeekHeader = (line: string) => /^week\s*\d+/i.test(line.trim());
const isCircularHeader = (line: string) => /^circular\s*\//i.test(line.trim());
const isSchoolNoteLine = (line: string) => /^(?:~\s*)?(?:all\s+books|books\s+and\s+notebooks|note\b|kindly\b|parents?\b)/i.test(line.trim());
const isScheduleArtifactLine = (line: string) => {
  const normalized = line.trim();
  const compactDateCount = (normalized.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g) ?? []).length;
  const shortYearTimetableDate = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2}\b/.test(normalized) && new RegExp(`[(]${weekdayToken}[)]`, "i").test(normalized);
  const weekdaySubjectOnly = new RegExp(`^[(]?${weekdayToken}[)]?\\s+(?:${knownSubjects.map((subject) => subject.replace(/\s+/g, "\\s+")).join("|")})$`, "i").test(normalized);

  return compactDateCount > 1 || shortYearTimetableDate || weekdaySubjectOnly;
};
const shouldSkipGenericLine = (line: string) => isSchoolNoteLine(line) || isScheduleArtifactLine(line);

const inferDefaultYear = (text: string, relativePath: string) => {
  const yearMatch = `${relativePath}\n${text}`.match(/\b20\d{2}\b/);
  return yearMatch?.[0] ?? dayjs().format("YYYY");
};

const buildContextualDate = (day: string, defaultMonthLabel?: string, defaultYear?: string) => {
  if (!defaultMonthLabel) {
    return undefined;
  }

  const parsed = dayjs(`${day} ${defaultMonthLabel} ${defaultYear ?? dayjs().format("YYYY")}`, "D MMMM YYYY", true);
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }

  const shortParsed = dayjs(`${day} ${defaultMonthLabel} ${defaultYear ?? dayjs().format("YYYY")}`, "D MMM YYYY", true);
  return shortParsed.isValid() ? shortParsed.format("YYYY-MM-DD") : undefined;
};

const extractVisibleWeekday = (line: string) => line.match(new RegExp(`\\b${weekdayToken}\\b`, "i"))?.[0];

const validateVisibleWeekday = (dueDate: string, line: string) => {
  const visibleWeekday = extractVisibleWeekday(line);
  if (!visibleWeekday) {
    return undefined;
  }

  const expectedDay = weekdayIndexes[visibleWeekday.toLowerCase()];
  const actualDay = dayjs(dueDate, "YYYY-MM-DD", true).day();
  return expectedDay === actualDay ? undefined : "Date and weekday mismatch";
};

const extractDateParts = (line: string): { dateToken: string; dueDate: string; parserIssue?: string } | undefined => {
  const dateToken =
    line.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    line.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ??
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

const extractContextualDateParts = (line: string, defaultMonthLabel?: string, defaultYear?: string) => {
  const contextualToken =
    line.match(new RegExp(`^(\\d{1,2})\\s+${weekdayToken}\\b`, "i"))?.[0] ??
    line.match(new RegExp(`^${weekdayToken}\\s+(\\d{1,2})\\b`, "i"))?.[0] ??
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

  const dateParts = extractDateParts(parts[0]) ?? extractContextualDateParts(parts[0], defaultMonthLabel, defaultYear);
  const category = inferCategory(parts[1]) ?? currentCategory;
  const title = parts.slice(2).join(" ").trim() || (parts.length === 2 ? undefined : undefined);

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
  const match = childAliases.find((childName) => {
    const escapedAlias = childName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${escapedAlias}([^a-z0-9]|$)`, "i").test(haystack);
  });
  return match;
};

const extractSubjectParts = (title: string): { subject?: string; title: string } => {
  const subject = knownSubjects.find((entry) => new RegExp(`^${entry.replace(/\s+/g, "\\s+")}\\b`, "i").test(title));
  if (!subject) {
    return { title };
  }

  const nextTitle = title.replace(new RegExp(`^${subject.replace(/\s+/g, "\\s+")}\\b[:\\s-]*`, "i"), "").trim();
  return {
    subject,
    title: nextTitle || `Study ${subject}`,
  };
};

const trimTitleSeparators = (value: string) => {
  let start = 0;
  let end = value.length;

  while (start < end && (value[start] === "-" || value[start] === ":" || value[start] === "|" || /\s/.test(value[start]))) {
    start += 1;
  }

  while (end > start && (value[end - 1] === "-" || value[end - 1] === ":" || value[end - 1] === "|" || /\s/.test(value[end - 1]))) {
    end -= 1;
  }

  return value.slice(start, end);
};

const cleanTitle = (line: string, category: string, dateToken?: string) => {
  let next = line;
  if (dateToken) {
    next = next.replace(dateToken, "");
  }

  next = next.replace(new RegExp(category.replace(/([A-Z])/g, " $1").trim(), "i"), "");
  return trimTitleSeparators(next).trim();
};

const extractExplicitSchoolKeywordRow = (line: string, childName: string | undefined, defaultMonthLabel?: string, defaultYear?: string): RawImportRecord | undefined => {
  const match = schoolKeywordRows.find((entry) => entry.pattern.test(line));
  if (!match) {
    return undefined;
  }

  if (match.category === "UnitTest" && /^unit\s*test\b[\s\-:i0-9().]*$/i.test(line.trim())) {
    return undefined;
  }

  const dateParts = extractDateParts(line) ?? extractContextualDateParts(line, defaultMonthLabel, defaultYear);
  const withoutDate = dateParts ? line.replace(dateParts.dateToken, "") : line;
  const rawTitle = normalizeText(match.titlePrefix ? withoutDate.replace(match.titlePrefix, "") : withoutDate);
  const subjectParts = match.subject ? { subject: match.subject, title: rawTitle } : extractSubjectParts(rawTitle);
  const title = subjectParts.title || (subjectParts.subject ? `Study ${subjectParts.subject}` : rawTitle);

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
    parserIssue: dateParts?.parserIssue ?? (!dateParts ? "Date needs confirmation" : undefined),
  };
};

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const buildDefaultDueDate = (defaultMonthLabel?: string, defaultYear?: string) => {
  return buildContextualDate("1", defaultMonthLabel, defaultYear) ?? dayjs().format("YYYY-MM-DD");
};

const normalizeSubjectHeader = (subject: string) => subject.toUpperCase().replace(/\s+/g, "\\s+").replace(/&/g, "&");

const extractSectionBetweenHeaders = (text: string, subject: string, subjects: string[]) => {
  const startMatch = new RegExp(`\\b${normalizeSubjectHeader(subject)}\\b`, "i").exec(text);
  if (!startMatch) {
    return undefined;
  }

  const tail = text.slice(startMatch.index + startMatch[0].length);
  const nextIndexes = subjects
    .filter((entry) => entry !== subject)
    .map((entry) => new RegExp(`\\b${normalizeSubjectHeader(entry)}\\b`, "i").exec(tail)?.index)
    .filter((index): index is number => typeof index === "number" && index >= 0);
  const endIndex = nextIndexes.length > 0 ? Math.min(...nextIndexes) : tail.length;

  return normalizeText(tail.slice(0, endIndex));
};

const cleanExtractedSectionTitle = (value: string) => {
  return normalizeText(value)
    .replace(/\bJULY\s+\d+(?:st|nd|rd|th)?\s+WEEK\b/gi, "")
    .replace(/\(\d{1,2}(?:st|nd|rd|th)?\s+JULY\s+[–-]\s+\d{1,2}(?:st|nd|rd|th)?\s+JULY\)/gi, "")
    .replace(/\bACTIVITIES\b/gi, "")
    .replace(/\bChapter\s*-?\s*\d+\s+How Things Move\b/gi, "")
    .replace(/\bSCIENCE\b$/gi, "")
    .replace(/\bChand tare\b$/gi, "")
    .replace(/\bYoko tsuki\s*=\s*side punch\b$/gi, "")
    .replace(/\bContemporary style\s+contemporary style\s+contemporary style\b$/gi, "")
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "")
    .trim();
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

const extractCoScholasticRows = (contentText: string, childName: string | undefined, defaultMonthLabel?: string, defaultYear?: string): RawImportRecord[] => {
  if (!/co\s*scholastic/i.test(contentText)) {
    return [];
  }

  const dueDate = buildDefaultDueDate(defaultMonthLabel, defaultYear);
  return coScholasticSubjects.flatMap((subject) => {
    const section = extractSectionBetweenHeaders(contentText, subject, coScholasticSubjects);
    const title = section ? cleanExtractedSectionTitle(section) : undefined;
    if (!title) {
      return [];
    }

    return [{
      childName,
      category: "Activity",
      subject,
      title,
      dueDate,
      description: `${subject}: ${title}`,
    }];
  });
};

const extractUnitTestPortionRows = (contentText: string, childName: string | undefined): RawImportRecord[] => {
  if (!/unit\s*test/i.test(contentText) || !/chapter\s+name/i.test(contentText)) {
    return [];
  }

  return unitTestSubjects.flatMap((subject) => {
    const section = extractSectionBetweenHeaders(contentText, subject, unitTestSubjects);
    const title = section ? cleanExtractedSectionTitle(section).replace(/^Literature\s+/i, "") : undefined;
    if (!title) {
      return [];
    }

    return [{
      childName,
      category: "UnitTest",
      subject,
      title: `Unit Test Portion: ${title}`,
      parserIssue: "Unit test portion found without an exam schedule date",
      description: `${subject}: ${title}`,
    }];
  });
};

const extractUnitTestScheduleRows = (contentText: string, childName: string | undefined): RawImportRecord[] => {
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

      const subject = unitTestScheduleSubjects.find((entry) => new RegExp(`\\b${entry.replace(/\s+/g, "\\s+")}\\b`, "i").test(line));
      if (!subject) {
        return [];
      }

      const normalizedSubject = normalizeUnitTestSubject(subject);
      return [{
        childName,
        category: "UnitTest",
        subject: normalizedSubject,
        title: `${normalizedSubject} Unit Test`,
        dueDate: dateParts.dueDate,
        description: line,
        parserIssue: dateParts.parserIssue,
      }];
    });
};

const extractScholasticActivityRows = (contentText: string, childName: string | undefined, defaultMonthLabel?: string, defaultYear?: string): RawImportRecord[] => {
  const flatText = normalizeText(contentText);
  const dueDate = buildDefaultDueDate(defaultMonthLabel, defaultYear);
  const rows: RawImportRecord[] = [];
  const labMatch = flatText.match(/Graded Lab activity\s*[–-]\s*([^]+?)(?=\s+Chapter\s*-?\s*\d+\s+How Things Move|\s+SCIENCE\b|\s+Graded Project\b|\s+CCA\b|$)/i);
  const projectMatch = flatText.match(/Graded Project\s*[–-]\s*([^]+?)(?=\s+SCIENCE\b|\s+CCA\b|\s+Talk the Talk\b|$)/i);
  const ccaMatch = flatText.match(/CCA\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s+([^]+?)(?=\s+Talk the Talk\b|$)/i);
  const talkMatch = flatText.match(/Talk the Talk\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s+([^]+?)(?=$)/i);

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

  Array.from(flatText.matchAll(/\bGraded\s+((?:Speaking|Listening|Lab|Practical|Map|Art|Creative)\s+Skills?|Lab\s+activity)\b/gi)).forEach((match) => {
    const title = cleanExtractedSectionTitle(match[0]);
    if (!title || /lab\s+activity/i.test(title) || rows.some((row) => row.category === "Activity" && row.title === title)) {
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

  Array.from(flatText.matchAll(/\b(?:Graded\s+)?Project\b\s*[:–-]?\s*([^.;\n]+)?/gi)).forEach((match) => {
    const title = cleanExtractedSectionTitle(match[1] ?? match[0]);
    if (!title || /detected|content/i.test(title) || rows.some((row) => row.category === "Project") || rows.some((row) => row.category === "Project" && row.title === title)) {
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
  const inferredChildName = inferChildName(contentText, relativePath, childNames);
  const defaultMonthLabel = extractMonthLabel(relativePath, contentText);
  const defaultYear = inferDefaultYear(contentText, relativePath);
  const supplementalRows = [
    ...extractCoScholasticRows(contentText, inferredChildName, defaultMonthLabel, defaultYear),
    ...extractUnitTestPortionRows(contentText, inferredChildName),
    ...extractUnitTestScheduleRows(contentText, inferredChildName),
    ...extractScholasticActivityRows(contentText, inferredChildName, defaultMonthLabel, defaultYear),
  ];

  const genericRows = contentText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .reduce<{ records: RawImportRecord[]; currentCategory?: string }>((state, line) => {
      if (shouldSkipGenericLine(line)) {
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

      const delimitedRow = extractDelimitedRow(line, state.currentCategory, defaultMonthLabel, defaultYear);
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

      const dateParts = extractDateParts(line) ?? extractContextualDateParts(line, defaultMonthLabel, defaultYear);
      const explicitRow = state.currentCategory ? undefined : extractExplicitSchoolKeywordRow(line, inferredChildName, defaultMonthLabel, defaultYear);
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
    }, { records: [] }).records;

  return [...genericRows, ...supplementalRows];
};
