import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildProfile, SchoolItem } from "@/types/domain";
import { bySelectedChildren, childSummary, monthlyCounts, thisWeekItems, todayItems } from "./planning-selectors";

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

  it("returns items due in the next 7-day window", () => {
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
});
