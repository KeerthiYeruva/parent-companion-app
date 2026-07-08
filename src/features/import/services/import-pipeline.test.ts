import { describe, expect, it } from "vitest";
import { importPipeline } from "@/features/import/services/import-pipeline";

describe("importPipeline", () => {
  it("normalizes, validates, and builds valid school items", () => {
    const result = importPipeline.run(
      [
        {
          childName: "aarav",
          category: "Homework",
          title: "Math worksheet",
          dueDate: "2026-07-10",
        },
      ],
      {
        sourceType: "csv",
        documentId: "doc-1",
        childNameToIdMap: {
          aarav: "child-1",
        },
      },
    );

    expect(result.summary).toEqual({
      totalRecords: 1,
      normalizedRecords: 1,
      validRecords: 1,
      issuesCount: 0,
    });

    expect(result.items).toEqual([
      {
        childId: "child-1",
        category: "Homework",
        title: "Math worksheet",
        description: undefined,
        dueDate: "2026-07-10",
        sourceDocumentId: "doc-1",
      },
    ]);
  });

  it("reports issues for invalid records and excludes them from items", () => {
    const result = importPipeline.run(
      [
        {
          childName: "unknown child",
          category: "NotARealCategory",
          title: "",
          dueDate: "not-a-date",
        },
      ],
      {
        sourceType: "manual",
        documentId: "doc-2",
        childNameToIdMap: {
          aarav: "child-1",
        },
      },
    );

    expect(result.items).toEqual([]);
    expect(result.summary.validRecords).toBe(0);
    expect(result.summary.issuesCount).toBe(4);
    expect(result.issues.map((issue) => issue.fieldName).sort()).toEqual(["category", "childName", "dueDate", "title"]);
  });
});
