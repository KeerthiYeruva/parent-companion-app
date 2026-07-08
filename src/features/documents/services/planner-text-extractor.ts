import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { RawImportRecord } from "@/features/import";

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
];

const inferCategory = (line: string) => {
  const match = categoryPatterns.find((entry) => entry.pattern.test(line));
  return match?.category;
};

const extractDateParts = (line: string): { dateToken: string; dueDate: string } | undefined => {
  const dateToken =
    line.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    line.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/)?.[0] ??
    line.match(/\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/)?.[0];

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

  return contentText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .reduce<RawImportRecord[]>((records, line) => {
      const category = inferCategory(line);
      const dateParts = extractDateParts(line);
      if (!category || !dateParts) {
        return records;
      }

      const title = cleanTitle(line, category, dateParts.dateToken);
      if (!title) {
        return records;
      }

      records.push({
        childName: inferredChildName,
        category,
        title,
        dueDate: dateParts.dueDate,
        description: line,
      });

      return records;
    }, []);
};
