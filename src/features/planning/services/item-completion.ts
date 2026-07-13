import dayjs from "dayjs";
import type { SchoolItem } from "@/types/domain";

export const isItemCompleted = (item: Pick<SchoolItem, "status" | "completedAt">) =>
  item.status === "Completed" || Boolean(item.completedAt);

export const isItemFutureLocked = (
  item: Pick<SchoolItem, "dueDate">,
  today = dayjs(),
) => dayjs(item.dueDate).startOf("day").isAfter(today.startOf("day"));

export const completionButtonLabel = (item: SchoolItem, today = dayjs()) => {
  if (isItemFutureLocked(item, today)) {
    return `Available on the due date: ${item.title}`;
  }

  return `${isItemCompleted(item) ? "Mark incomplete" : "Mark complete"}: ${item.title}`;
};

export type ItemTiming = "overdue" | "today" | "upcoming" | "completed";

export const getItemTiming = (item: SchoolItem, today = dayjs()): ItemTiming => {
  if (isItemCompleted(item)) {
    return "completed";
  }

  const due = dayjs(item.dueDate).startOf("day");
  const current = today.startOf("day");

  if (due.isBefore(current, "day")) return "overdue";
  if (due.isSame(current, "day")) return "today";
  return "upcoming";
};

export const itemTimingLabel = (item: SchoolItem, today = dayjs()) => {
  const timing = getItemTiming(item, today);

  if (timing === "completed") return "Done";
  if (timing === "overdue") return "Overdue";
  if (timing === "today") return "Due today";
  if (dayjs(item.dueDate).startOf("day").isSame(today.add(1, "day").startOf("day"), "day")) {
    return "Tomorrow";
  }

  return dayjs(item.dueDate).format("ddd, DD MMM");
};

export const itemTimingClasses = (timing: ItemTiming) => {
  if (timing === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (timing === "overdue") return "border-rose-200 bg-rose-50 text-rose-700";
  if (timing === "today") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-700";
};
