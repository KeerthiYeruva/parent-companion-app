import dayjs from "dayjs";
import { normalizeForComparison } from "@/features/import/services/import-content";
import type { SchoolItem } from "@/types/domain";

export const itemTypeLabel = (category: SchoolItem["category"]) => {
  if (category === "ClassTest") return "Class Test";
  if (category === "UnitTest") return "Unit Test";
  if (category === "HomeStudy") return "Home Study";
  return category.replace(/([a-z])([A-Z])/g, "$1 $2");
};

const categoryGroupLabel = (category: SchoolItem["category"]) => {
  if (["ClassTest", "UnitTest", "Exam"].includes(category)) return "Tests";
  if (category === "Activity") return "Activities";
  if (category === "Project") return "Projects";
  if (category === "HomeStudy") return "Study tasks";
  return category;
};

const stripRawDateFragments = (value?: string) =>
  value
    ?.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, "")
    .replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeChapterText = (value?: string) => {
  const text = stripRawDateFragments(value)
    ?.replace(/^class\s*test\s*/i, "")
    .replace(/^unit\s*test\s*portion:\s*/i, "Portions: ")
    .replace(/\bchapter\s*[-:]?\s*(\d+)/gi, "Chapter $1")
    .replace(/\s+[-:]\s+/g, " - ")
    .trim();

  if (!text) return undefined;

  const chapterMatches = Array.from(
    text.matchAll(/Chapter\s+(\d+)\s*[-:]?\s*([^]*?)(?=Chapter\s+\d+|$)/gi),
  );
  if (chapterMatches.length > 0) {
    return chapterMatches
      .map((match) => {
        const name = match[2]?.replace(/^[-:\s]+/, "").trim();
        return name ? `Chapter ${match[1]} - ${name}` : `Chapter ${match[1]}`;
      })
      .join("\n");
  }

  return text;
};

const hasChapterLikeContent = (value?: string) =>
  Boolean(value && /\b(?:chapter|portion|portions)\b/i.test(value));

export const buildPlannerItemDisplay = (item: SchoolItem) => {
  const itemType = itemTypeLabel(item.category);
  const normalizedTitle = normalizeForComparison(item.title);
  const normalizedType = normalizeForComparison(itemType);
  const titleLooksLikeTypePlusChapter =
    normalizedTitle.startsWith(normalizedType) && /\bchapter\b/i.test(item.title);
  const heading = item.title && normalizedTitle !== normalizedType && !titleLooksLikeTypePlusChapter
    ? stripRawDateFragments(item.title) || itemType
    : itemType;
  const chapter =
    item.chapterNumber || item.chapterName
      ? [item.chapterNumber ? `Chapter ${item.chapterNumber}` : undefined, item.chapterName]
          .filter(Boolean)
          .join(" - ")
      : normalizeChapterText(
          hasChapterLikeContent(item.description)
            ? item.description
            : hasChapterLikeContent(item.title)
              ? item.title
              : undefined,
        );
  const normalizedHeading = normalizeForComparison(heading);
  const normalizedChapter = normalizeForComparison(chapter);
  const cleanedDescription = normalizeChapterText(item.description);
  const normalizedDescription = normalizeForComparison(cleanedDescription);
  const description =
    cleanedDescription &&
    normalizedDescription !== normalizedHeading &&
    normalizedDescription !== normalizedChapter
      ? cleanedDescription
      : undefined;

  return {
    heading,
    chapter,
    description,
    date: dayjs(item.dueDate).format("ddd, DD MMM"),
    category: categoryGroupLabel(item.category),
    subject: item.subject,
  };
};
