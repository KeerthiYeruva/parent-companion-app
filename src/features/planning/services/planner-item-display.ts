import dayjs from "dayjs";
import { normalizeForComparison } from "@/features/import/services/import-content";
import { taskCategoryLabel } from "@/features/planning/selectors/planning-selectors";
import type { SchoolItem } from "@/types/domain";

export const buildPlannerItemDisplay = (item: SchoolItem) => {
  const heading = item.title;
  const chapter =
    item.chapterNumber || item.chapterName
      ? [item.chapterNumber ? `Chapter ${item.chapterNumber}` : undefined, item.chapterName]
          .filter(Boolean)
          .join(" - ")
      : undefined;
  const normalizedHeading = normalizeForComparison(heading);
  const normalizedChapter = normalizeForComparison(chapter);
  const normalizedDescription = normalizeForComparison(item.description);
  const description =
    item.description &&
    normalizedDescription !== normalizedHeading &&
    normalizedDescription !== normalizedChapter
      ? item.description
      : undefined;

  return {
    heading,
    chapter,
    description,
    date: dayjs(item.dueDate).format("ddd, DD MMM"),
    category: taskCategoryLabel(item.category),
    subject: item.subject,
  };
};
