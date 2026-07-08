import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { RawImportRecord } from "@/features/import";
import { extractMonthLabel } from "@/features/documents/services/month-extractor";

dayjs.extend(customParseFormat);

const categoryPatterns: Array<{ category: string; pattern: RegExp }> = [
  { category: "Homework", pattern: /\bhomework\b/i },
  { category: "ClassTest", pattern: /\bclass\s*test\b/i },
  { category: "UnitTest", pattern: /\bunit\s*test\b/i },
  { category: "Activity", pattern: /\b(activity|activities|event|competition)\b/i },
  { category: "Project", pattern: /\bproject\b/i },
  { category: "Exam", pattern: /\bexam\b/i },
  { category: "HomeStudy", pattern: /\bhome\s*study\b/i },
  { category: "Circular", pattern: /\bcircular\b/i },
];

const datePatterns = [
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "DD/MM/YYYY",
  "D/M/YYYY",
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
  "GK",
  "Art",
  "Dance",
  "Music",
];

const inferCategory = (line: string) => {
  const match = categoryPatterns.find((entry) => entry.pattern.test(line));
  return match?.category;
};

const isCategoryHeader = (line: string) => {
  return categoryPatterns.some((entry) => new RegExp(`^${entry.pattern.source}s?$`, "i").test(line.trim()));
};

const isWeekHeader = (line: string) => /^week\s*\d+/i.test(line.trim());

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

const extractDateParts = (line: string): { dateToken: string; dueDate: string } | undefined => {
  const dateToken =
    line.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    line.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/)?.[0] ??
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
  const match = childAliases.find((childName) => haystack.includes(childName.toLowerCase()));
  return match;
};

const extractSubjectParts = (title: string): { subject?: string; title: string } => {
  const subject = knownSubjects.find((entry) => new RegExp(`^${entry.replace(/\s+/g, "\\s+")}\\b`, "i").test(title));
  if (!subject) {
    return { title };
  }

  const nextTitle = title.replace(new RegExp(`^${subject.replace(/\s+/g, "\\s+")}\\b[:\-\s]*`, "i"), "").trim();
  return {
    subject,
    title: nextTitle || title,
  };
};

const cleanTitle = (line: string, category: string, dateToken?: string) => {
  let next = line;
  if (dateToken) {
    next = next.replace(dateToken, "");
  }

  next = next.replace(new RegExp(category.replace(/([A-Z])/g, " $1").trim(), "i"), "");
  next = next.replace(/^[-:|\s]+/, "").replace(/[-:|\s]+$/, "");
  return next.trim();
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

  return contentText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .reduce<{ records: RawImportRecord[]; currentCategory?: string }>((state, line) => {
      if (isWeekHeader(line)) {
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
        });

        return state;
      }

      const category = inferCategory(line) ?? state.currentCategory;
      const dateParts = extractDateParts(line) ?? extractContextualDateParts(line, defaultMonthLabel, defaultYear);
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
      });

      return state;
    }, { records: [] }).records;
};
