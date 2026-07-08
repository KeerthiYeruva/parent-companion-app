import { describe, expect, it } from "vitest";
import { detectPlannerDocument } from "@/features/documents/services/document-detector";
import { classifyPlannerDocument } from "@/features/documents/services/planner-classifier";
import { extractMonthLabel } from "@/features/documents/services/month-extractor";

describe("document intelligence", () => {
  it("classifies planner documents from file name and content", () => {
    expect(classifyPlannerDocument("July Scholastic Planner.pdf", "Monthly scholastic planner")).toBe("ScholasticPlanner");
    expect(classifyPlannerDocument("Unit Test Portion.pdf", "Unit Test Portion for July")).toBe("UnitTestPortion");
    expect(classifyPlannerDocument("random.pdf", "unknown content")).toBe("Unknown");
  });

  it("extracts month labels from file name or content", () => {
    expect(extractMonthLabel("July Planner.pdf")).toBe("July");
    expect(extractMonthLabel("planner.pdf", "Activities for August month")).toBe("August");
    expect(extractMonthLabel("planner.pdf", "No month here")).toBeUndefined();
  });

  it("detects planner summary metadata and stable hash", () => {
    const result = detectPlannerDocument({
      name: "Grade5_July_Scholastic_Planner.pdf",
      relativePath: "Kid1/July/Grade5_July_Scholastic_Planner.pdf",
      size: 1024,
      modifiedAt: "2026-07-08T00:00:00.000Z",
      contentText: "Grade 5 monthly scholastic planner for July",
    });

    expect(result.detectedType).toBe("ScholasticPlanner");
    expect(result.monthLabel).toBe("July");
    expect(result.childHints).toContain("Grade 5");
    expect(result.fileHash).toHaveLength(40);
  });
});
