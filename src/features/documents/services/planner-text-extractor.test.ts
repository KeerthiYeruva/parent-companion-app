import { describe, expect, it } from "vitest";
import { extractPlannerRows } from "@/features/documents/services/planner-text-extractor";

describe("extractPlannerRows", () => {
  it("extracts dated planner rows with inferred child name and categories", () => {
    const rows = extractPlannerRows({
      relativePath: "Aarav/July/Planner.pdf",
      childNames: ["Aarav", "Myra"],
      contentText: [
        "2026-07-10 Homework Math worksheet chapter 3",
        "11/07/2026 Class Test Science revision 2",
        "12 July 2026 Activity Dance practice",
      ].join("\n"),
    });

    expect(rows).toEqual([
      {
        childName: "Aarav",
        category: "Homework",
        title: "Math worksheet chapter 3",
        dueDate: "2026-07-10",
        description: "2026-07-10 Homework Math worksheet chapter 3",
      },
      {
        childName: "Aarav",
        category: "ClassTest",
        title: "Science revision 2",
        dueDate: "2026-07-11",
        description: "11/07/2026 Class Test Science revision 2",
      },
      {
        childName: "Aarav",
        category: "Activity",
        title: "Dance practice",
        dueDate: "2026-07-12",
        description: "12 July 2026 Activity Dance practice",
      },
    ]);
  });

  it("skips lines that do not contain both category and parseable date", () => {
    const rows = extractPlannerRows({
      relativePath: "Planner.pdf",
      childNames: [],
      contentText: "Homework no date here\n2026-07-10 no category here",
    });

    expect(rows).toEqual([]);
  });

  it("extracts section-based planner rows using month context and active category headers", () => {
    const rows = extractPlannerRows({
      relativePath: "Aarav/July/Monthly Planner.pdf",
      childNames: ["Aarav", "Myra"],
      contentText: [
        "July 2026 Planner",
        "Homework",
        "10 Mon Math worksheet chapter 3",
        "11 Tue English reading pages 10-12",
        "Class Test",
        "12 Wed Science revision lesson 4",
        "Activities",
        "14 Fri Dance practice",
      ].join("\n"),
    });

    expect(rows).toEqual([
      {
        childName: "Aarav",
        category: "Homework",
        title: "Math worksheet chapter 3",
        dueDate: "2026-07-10",
        description: "10 Mon Math worksheet chapter 3",
      },
      {
        childName: "Aarav",
        category: "Homework",
        title: "English reading pages 10-12",
        dueDate: "2026-07-11",
        description: "11 Tue English reading pages 10-12",
      },
      {
        childName: "Aarav",
        category: "ClassTest",
        title: "Science revision lesson 4",
        dueDate: "2026-07-12",
        description: "12 Wed Science revision lesson 4",
      },
      {
        childName: "Aarav",
        category: "Activity",
        title: "Dance practice",
        dueDate: "2026-07-14",
        description: "14 Fri Dance practice",
      },
    ]);
  });
});
