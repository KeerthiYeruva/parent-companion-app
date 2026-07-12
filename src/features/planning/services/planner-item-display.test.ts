import { describe, expect, it } from "vitest";
import { buildPlannerItemDisplay } from "@/features/planning/services/planner-item-display";
import type { SchoolItem } from "@/types/domain";

const item = (overrides: Partial<SchoolItem>): SchoolItem => ({
  id: "item-1",
  childId: "child-1",
  category: "ClassTest",
  title: "Class Test",
  dueDate: "2026-07-13",
  status: "Pending",
  ...overrides,
});

describe("buildPlannerItemDisplay", () => {
  it("hides description when it differs only by case", () => {
    const display = buildPlannerItemDisplay(
      item({
        title: "Class Test Chapter 5",
        description: "class test chapter 5",
      }),
    );

    expect(display.description).toBeUndefined();
  });

  it("hides description when it differs only by punctuation or spacing", () => {
    const display = buildPlannerItemDisplay(
      item({
        title: "Class Test: Chapter 5",
        description: "Class   Test - Chapter 5",
      }),
    );

    expect(display.description).toBeUndefined();
  });

  it("shows description when it contains different meaningful content", () => {
    const display = buildPlannerItemDisplay(
      item({
        title: "Class Test",
        chapterNumber: "5",
        description: "Numbers up Home Study Pg. No. 104",
      }),
    );

    expect(display).toMatchObject({
      heading: "Class Test",
      chapter: "Chapter 5",
      description: "Numbers up Home Study Pg. No. 104",
      category: "Tests",
    });
  });
});
