import dayjs from "dayjs";
import type { ChildProfile, ScanSessionFileRecord, SchoolItem, UploadedDocument } from "@/types/domain";

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

export const monthlyCounts = (items: SchoolItem[]) => {
  const start = dayjs().startOf("month");
  const end = dayjs().endOf("month");
  const inMonth = items.filter((item) => {
    const due = dayjs(item.dueDate);
    return due.isAfter(start.subtract(1, "day")) && due.isBefore(end.add(1, "day"));
  });

  return {
    homework: inMonth.filter((item) => item.category === "Homework").length,
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
    reviewCount: matchingFiles.filter((file) => file.status === "review").length,
  };
};
