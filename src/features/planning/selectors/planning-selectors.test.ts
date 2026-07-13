import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildProfile, SchoolItem } from "@/types/domain";
import {
  bySelectedChildren,
  childSummary,
  completionProgress,
  itemsByTaskBucket,
  itemsByChild,
  monthlyCounts,
  monthItemsByWeek,
  orderPlannerItems,
  splitOpenAndCompletedItems,
  thisMonthItems,
  thisWeekItems,
  todayItems,
} from "./planning-selectors";

const childA: ChildProfile = {
  id: "child-a",
  name: "Aarav",
  grade: "4",
  section: "A",
  academicYear: "2026-2027",
  colorTag: "bg-blue-500",
};

const childB: ChildProfile = {
  id: "child-b",
  name: "Myra",
  grade: "8",
  section: "B",
  academicYear: "2026-2027",
  colorTag: "bg-emerald-500",
};

const baseItems: SchoolItem[] = [
  {
    id: "i-1",
    childId: childA.id,
    category: "Homework",
    title: "Math worksheet",
    dueDate: "2026-07-08",
    status: "Pending",
  },
  {
    id: "i-2",
    childId: childA.id,
    category: "Activity",
    title: "Art class",
    dueDate: "2026-07-09",
    status: "Upcoming",
  },
  {
    id: "i-3",
    childId: childB.id,
    category: "ClassTest",
    title: "Science class test",
    dueDate: "2026-07-10",
    status: "Upcoming",
  },
  {
    id: "i-4",
    childId: childB.id,
    category: "Project",
    title: "History model",
    dueDate: "2026-07-20",
    status: "Pending",
  },
  {
    id: "i-5",
    childId: childA.id,
    category: "Homework",
    title: "Completed English work",
    dueDate: "2026-07-08",
    status: "Completed",
  },
];

describe("planning selectors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-08T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters items by selected children", () => {
    const selected = bySelectedChildren(baseItems, [childA.id]);
    expect(selected).toHaveLength(3);
    expect(selected.every((item) => item.childId === childA.id)).toBe(true);
  });

  it("returns all items when child filter is empty", () => {
    expect(bySelectedChildren(baseItems, [])).toHaveLength(baseItems.length);
  });

  it("returns only non-completed items due today", () => {
    const result = todayItems(baseItems);
    expect(result.map((item) => item.id)).toEqual(["i-1"]);
  });

  it("returns items due in the Monday to Sunday school week", () => {
    const result = thisWeekItems(baseItems);
    expect(result.map((item) => item.id)).toEqual(["i-1", "i-2", "i-3", "i-5"]);
  });

  it("computes monthly category counts", () => {
    const counts = monthlyCounts(baseItems);
    expect(counts).toEqual({
      homework: 2,
      tests: 1,
      activities: 1,
      projects: 1,
    });
  });

  it("computes child summary for pending tasks, tests, and tomorrow activity", () => {
    const summary = childSummary(childA, baseItems);
    expect(summary).toEqual({
      pendingTasks: 1,
      upcomingTests: 0,
      activityTomorrow: true,
    });
  });

  it("computes completion progress", () => {
    expect(completionProgress(baseItems)).toEqual({
      completed: 1,
      total: 5,
      label: "1 of 5 done",
      percent: 20,
    });
  });

  it("splits open and completed tasks", () => {
    const split = splitOpenAndCompletedItems(baseItems);

    expect(split.open.map((item) => item.id)).toEqual(["i-1", "i-2", "i-3", "i-4"]);
    expect(split.completed.map((item) => item.id)).toEqual(["i-5"]);
  });

  it("groups selected items by child with progress", () => {
    const groups = itemsByChild([childA, childB], baseItems);

    expect(groups).toHaveLength(2);
    expect(groups[0].child.id).toBe(childA.id);
    expect(groups[0].progress.label).toBe("1 of 3 done");
    expect(groups[1].child.id).toBe(childB.id);
    expect(groups[1].progress.label).toBe("0 of 2 done");
  });

  it("orders overdue pending, today pending, upcoming pending, then completed", () => {
    const ordered = orderPlannerItems([
      { ...baseItems[4], id: "completed", title: "Completed" },
      { ...baseItems[3], id: "upcoming", title: "Upcoming", dueDate: "2026-07-20" },
      { ...baseItems[1], id: "today", title: "Today", dueDate: "2026-07-08", status: "Pending" },
      { ...baseItems[0], id: "overdue", title: "Overdue", dueDate: "2026-07-07" },
    ]);

    expect(ordered.map((item) => item.id)).toEqual([
      "overdue",
      "today",
      "upcoming",
      "completed",
    ]);
  });

  it("returns an uncompleted item to its due-date position", () => {
    const ordered = orderPlannerItems([
      { ...baseItems[4], id: "was-completed", status: "Pending", completedAt: undefined },
      { ...baseItems[3], id: "future", dueDate: "2026-07-20" },
    ]);

    expect(ordered.map((item) => item.id)).toEqual(["was-completed", "future"]);
  });

  it("groups internal categories into parent-facing task buckets", () => {
    const buckets = itemsByTaskBucket(baseItems);

    expect(buckets.map((bucket) => bucket.bucket)).toEqual(["Homework", "Tests", "Activities", "Projects", "Study tasks"]);
    expect(buckets.find((bucket) => bucket.bucket === "Homework")?.items).toHaveLength(2);
    expect(buckets.find((bucket) => bucket.bucket === "Tests")?.items).toHaveLength(1);
    expect(buckets.find((bucket) => bucket.bucket === "Activities")?.items).toHaveLength(1);
    expect(buckets.find((bucket) => bucket.bucket === "Projects")?.items).toHaveLength(1);
  });

  it("groups month items into weeks with progress", () => {
    const monthItems = thisMonthItems(baseItems);
    const groups = monthItemsByWeek(monthItems);

    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].progress.total).toBeGreaterThan(0);
    expect(groups.reduce((total, group) => total + group.items.length, 0)).toBe(monthItems.length);
  });
});
