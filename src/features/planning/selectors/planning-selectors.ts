import dayjs from "dayjs";
import type { ChildProfile, ScanSessionFileRecord, SchoolItem, UploadedDocument } from "@/types/domain";

export const taskBuckets = ["Homework", "Tests", "Activities", "Projects", "Study tasks"] as const;

export type TaskBucket = (typeof taskBuckets)[number];

export const taskCategoryLabel = (category: SchoolItem["category"]): TaskBucket | "Circular" => {
  if (["ClassTest", "UnitTest", "Exam"].includes(category)) {
    return "Tests";
  }

  if (category === "HomeStudy") {
    return "Study tasks";
  }

  if (category === "Activity") {
    return "Activities";
  }

  if (category === "Project") {
    return "Projects";
  }

  if (category === "Circular") {
    return "Circular";
  }

  return "Homework";
};

export const itemsByTaskBucket = (items: SchoolItem[]) => {
  return taskBuckets.map((bucket) => ({
    bucket,
    items: items.filter((item) => taskCategoryLabel(item.category) === bucket),
  }));
};

export const completionProgress = (items: SchoolItem[]) => {
  const total = items.length;
  const completed = items.filter((item) => item.status === "Completed").length;

  return {
    completed,
    total,
    label: `${completed}/${total} completed`,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

export const splitOpenAndCompletedItems = (items: SchoolItem[]) => {
  return {
    open: items.filter((item) => item.status !== "Completed"),
    completed: items.filter((item) => item.status === "Completed"),
  };
};

export const bySelectedChildren = (items: SchoolItem[], selectedChildIds: string[]) => {
  if (selectedChildIds.length === 0) {
    return items;
  }

  return items.filter((item) => selectedChildIds.includes(item.childId));
};

export const todayItems = (items: SchoolItem[]) => {
  const today = dayjs().format("YYYY-MM-DD");
  return items.filter((item) => item.dueDate === today && item.status !== "Completed");
};

export const thisWeekItems = (items: SchoolItem[]) => {
  const start = dayjs().startOf("day");
  const end = dayjs().add(6, "day").endOf("day");

  return items.filter((item) => {
    const due = dayjs(item.dueDate);
    return due.isAfter(start.subtract(1, "day")) && due.isBefore(end.add(1, "day"));
  });
};

export const thisMonthItems = (items: SchoolItem[]) => {
  const start = dayjs().startOf("month");
  const end = dayjs().endOf("month");

  return items
    .filter((item) => {
      const due = dayjs(item.dueDate);
      return due.isAfter(start.subtract(1, "day")) && due.isBefore(end.add(1, "day"));
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

export const itemsByChild = (children: ChildProfile[], items: SchoolItem[]) => {
  return children.map((child) => {
    const childItems = items.filter((item) => item.childId === child.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      child,
      items: childItems,
      progress: completionProgress(childItems),
    };
  });
};

export const monthItemsByWeek = (items: SchoolItem[]) => {
  const groups = new Map<string, SchoolItem[]>();

  items.forEach((item) => {
    const due = dayjs(item.dueDate);
    const weekStart = due.startOf("week");
    const weekEnd = due.endOf("week");
    const key = `${weekStart.format("YYYY-MM-DD")}__${weekEnd.format("YYYY-MM-DD")}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  });

  return Array.from(groups.entries()).map(([key, weekItems]) => {
    const [start, end] = key.split("__");
    const sortedItems = weekItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      key,
      label: `${dayjs(start).format("DD MMM")} - ${dayjs(end).format("DD MMM")}`,
      items: sortedItems,
      progress: completionProgress(sortedItems),
    };
  });
};

export const monthlyCounts = (items: SchoolItem[]) => {
  const inMonth = thisMonthItems(items);

  return {
    homework: inMonth.filter((item) => ["Homework", "HomeStudy"].includes(item.category)).length,
    tests: inMonth.filter((item) => ["ClassTest", "UnitTest", "Exam"].includes(item.category)).length,
    activities: inMonth.filter((item) => item.category === "Activity").length,
    projects: inMonth.filter((item) => item.category === "Project").length,
  };
};

export const childSummary = (child: ChildProfile, items: SchoolItem[]) => {
  const childItems = items.filter((item) => item.childId === child.id);
  const pendingTasks = childItems.filter((item) => item.status !== "Completed" && item.category !== "Activity").length;
  const upcomingTests = childItems.filter(
    (item) => ["ClassTest", "UnitTest", "Exam"].includes(item.category) && item.status !== "Completed",
  ).length;
  const activityTomorrow = childItems.some(
    (item) => item.category === "Activity" && dayjs(item.dueDate).isSame(dayjs().add(1, "day"), "day"),
  );

  return {
    pendingTasks,
    upcomingTests,
    activityTomorrow,
  };
};

export const childMonthReadiness = (child: ChildProfile, documents: UploadedDocument[]) => {
  const currentMonthLabel = dayjs().format("MMMM");
  const childDocuments = documents.filter((document) => document.childIds.includes(child.id) || document.childIds.length === 0);
  const monthDocuments = childDocuments.filter((document) => document.extractedMonth === currentMonthLabel);

  return {
    currentMonthLabel,
    documentCount: monthDocuments.length,
    isReady: monthDocuments.length > 0,
  };
};

export const childReviewSummary = (child: ChildProfile, scanQueue: ScanSessionFileRecord[]) => {
  const childKey = child.name.toLowerCase();
  const matchingFiles = scanQueue.filter((file) => {
    const pathMatch = file.relativePath.toLowerCase().includes(childKey);
    const hintMatch = file.childHints.some((hint) => hint.toLowerCase().includes(child.grade.toLowerCase()) || hint.toLowerCase().includes(childKey));
    return pathMatch || hintMatch;
  });

  return {
    fileCount: matchingFiles.length,
    reviewCount: matchingFiles.filter((file) => file.status === "needsReview" || file.status === "partiallyReady").length,
  };
};

