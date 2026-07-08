import { describe, expect, it } from "vitest";
import { detectPlannerDocument } from "@/features/documents/services/document-detector";

describe("detectPlannerDocument", () => {
  it("extracts numeric, roman, and section child hints", async () => {
    const result = await detectPlannerDocument({
      name: "GRADE_5_JULY_SCHOLASTIC_PLANNER.pdf",
      relativePath: "mocks/GRADE_5_JULY_SCHOLASTIC_PLANNER.pdf",
      size: 100,
      modifiedAt: "2026-07-08T00:00:00.000Z",
      contentText: "CLASS V SECTION B July planner",
    });

    expect(result.childHints).toContain("CLASS V");
    expect(result.childHints).toContain("SECTION B");
  });

  it("preserves grade range hints from shared circulars", async () => {
    const result = await detectPlannerDocument({
      name: "1782974912050_EXAM_CIRCULAR_UT_12026.pdf",
      relativePath: "mocks/1782974912050_EXAM_CIRCULAR_UT_12026.pdf",
      size: 100,
      modifiedAt: "2026-07-08T00:00:00.000Z",
      contentText: "CIRCULAR/41/2026-27/GRADE 1-5 02/07/2026",
    });

    expect(result.childHints).toContain("GRADE 1-5");
  });

  it("formats raw school file names into parent-friendly titles", async () => {
    const result = await detectPlannerDocument({
      name: "Grade_1_Unit_Test_Portion_20262027_9289.pdf",
      relativePath: "planners/Grade_1_Unit_Test_Portion_20262027_9289.pdf",
      size: 100,
      modifiedAt: "2026-07-08T00:00:00.000Z",
      contentText: "UNIT TEST - I S. No Subject Chapter No. Chapter Name",
    });

    expect(result.title).toBe("Grade 1 Unit Test Portions");
  });
});