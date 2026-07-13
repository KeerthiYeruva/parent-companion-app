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
