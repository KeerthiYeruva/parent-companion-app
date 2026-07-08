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

const inferCategory = (line: string) => {
  const match = categoryPatterns.find((entry) => entry.pattern.test(line));
  return match?.category;
};

const isCategoryHeader = (line: string) => {
  return categoryPatterns.some((entry) => new RegExp(`^${entry.pattern.source}s?$`, "i").test(line.trim()));
};

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

const inferChildName = (text: string, relativePath: string, childNames: string[]) => {
  const haystack = `${relativePath}\n${text}`.toLowerCase();
  const match = childNames.find((childName) => haystack.includes(childName.toLowerCase()));
  return match;
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
      if (isCategoryHeader(line)) {
        return {
          ...state,
          currentCategory: inferCategory(line),
        };
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

      state.records.push({
        childName: inferredChildName,
        category,
        title,
        dueDate: dateParts.dueDate,
        description: line,
      });

      return state;
    }, { records: [] }).records;
};
