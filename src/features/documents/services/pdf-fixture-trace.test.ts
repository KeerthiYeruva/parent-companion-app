import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractPdfTextFromData } from "./pdf-parser";
import { extractPlannerRows } from "./planner-text-extractor";
import { attachUnitTestDatesFromSchedule } from "@/features/documents/components/smart-folder-import";
import { importPipeline } from "@/features/import";

const extractFixtureRows = async (
  fileName: string,
  childName: string,
) => {
  const data = new Uint8Array(await readFile("mocks/" + fileName));
  const contentText = await extractPdfTextFromData(data);
  return extractPlannerRows({
    contentText,
    relativePath: fileName,
    childNames: [childName],
  });
};

describe("real Unit Test portion PDF fixtures", () => {
  it("extracts all seven Grade 1 table subjects with complete portions", async () => {
    const rows = await extractFixtureRows(
      "Grade_1_Unit_Test_Portion_20262027_9289.pdf",
      "Grade 1",
    );

    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.subject)).toEqual([
      "English",
      "Hindi",
      "Mathematics",
      "Science",
      "Computer Science",
      "General knowledge",
      "Kannada",
    ]);
    expect(rows.every((row) => row.title && row.description)).toBe(true);
    expect(rows.find((row) => row.subject === "Science")?.title)
      .toContain("How Things Move");
    expect(rows.find((row) => row.subject === "Computer Science")?.title)
      .toContain("Using Computers");
    expect(rows.find((row) => row.subject === "General knowledge")?.title)
      .toContain("Me and My Family");
    expect(rows.find((row) => row.subject === "Kannada")?.title)
      .toContain("Letters");
  });

  it("extracts all eight Grade 5 subjects across the real two-page PDF", async () => {
    const rows = await extractFixtureRows(
      "GRADE__5__UNIT_TEST_1_PORTION__20262027.pdf",
      "Grade 5",
    );

    expect(rows).toHaveLength(8);
    expect(rows.map((row) => row.subject)).toEqual([
      "English",
      "Hindi",
      "Mathematics",
      "Science",
      "Social Studies",
      "Computer Science",
      "General knowledge",
      "Kannada",
    ]);
    expect(rows.every((row) => row.title && row.description)).toBe(true);
    expect(rows.find((row) => row.subject === "Social Studies")?.title)
      .toContain("The DRC");
    expect(rows.find((row) => row.subject === "Computer Science")?.title)
      .toContain("Evolution of Computers");
    expect(rows.find((row) => row.subject === "General knowledge")?.title)
      .toContain("Computational Thinking");
    expect(rows.find((row) => row.subject === "Kannada")?.title)
      .toContain("Creative writing");
  });

  it("extracts only the seven authoritative Grade 1 timetable rows", async () => {
    const rows = await extractFixtureRows(
      "GRADE_1JULY_SCHOLASTIC_PLANNER___20262724626_2481.pdf",
      "Grade 1",
    );
    const unitTests = rows.filter((row) => row.category === "UnitTest");

    expect(unitTests).toHaveLength(7);
    expect(unitTests.every((row) => row.dueDate)).toBe(true);
    expect(unitTests.map((row) => row.subject)).not.toContain("Social Studies");
    expect(unitTests.every((row) => / Unit Test$/.test(row.title ?? ""))).toBe(true);
  });

  it("extracts only the eight authoritative Grade 5 timetable rows", async () => {
    const rows = await extractFixtureRows(
      "GRADE_5_JULY_SCHOLASTIC_PLANNER_202627_1_4603.pdf",
      "Grade 5",
    );
    const unitTests = rows.filter((row) => row.category === "UnitTest");

    expect(unitTests).toHaveLength(8);
    expect(unitTests.every((row) => row.dueDate)).toBe(true);
    expect(unitTests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "Social Studies",
          dueDate: "2026-07-24",
          title: "Social Studies Unit Test",
        }),
      ]),
    );
    expect(unitTests.every((row) => / Unit Test$/.test(row.title ?? ""))).toBe(true);
  });
  it("automatically produces 15 ready child-specific items from all four PDFs", async () => {
    const [grade1Schedule, grade5Schedule, grade1Portions, grade5Portions] =
      await Promise.all([
        extractFixtureRows(
          "GRADE_1JULY_SCHOLASTIC_PLANNER___20262724626_2481.pdf",
          "Grade 1",
        ),
        extractFixtureRows(
          "GRADE_5_JULY_SCHOLASTIC_PLANNER_202627_1_4603.pdf",
          "Grade 5",
        ),
        extractFixtureRows(
          "Grade_1_Unit_Test_Portion_20262027_9289.pdf",
          "Grade 1",
        ),
        extractFixtureRows(
          "GRADE__5__UNIT_TEST_1_PORTION__20262027.pdf",
          "Grade 5",
        ),
      ]);

    const nameRows = (rows: typeof grade1Schedule, childName: string) =>
      rows.map((row) => ({ ...row, childName }));
    const merged = attachUnitTestDatesFromSchedule([
      {
        rows: nameRows(grade1Schedule, "Ruthvish Reddy Annapareddy"),
        isGradeSpecificSchedule: true,
      },
      {
        rows: nameRows(grade5Schedule, "Luhas"),
        isGradeSpecificSchedule: true,
      },
      {
        rows: nameRows(grade1Portions, "Ruthvish Reddy Annapareddy"),
        isGradeSpecificSchedule: false,
      },
      {
        rows: nameRows(grade5Portions, "Luhas"),
        isGradeSpecificSchedule: false,
      },
    ]).flat().filter((row) => row.category === "UnitTest");

    const result = importPipeline.run(merged, {
      sourceType: "future-pdf",
      documentId: "four-real-july-fixtures",
      childNameToIdMap: {
        "ruthvish reddy annapareddy": "grade-1-child",
        luhas: "grade-5-child",
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.items).toHaveLength(15);
    expect(result.items.filter((item) => item.childId === "grade-1-child"))
      .toHaveLength(7);
    expect(result.items.filter((item) => item.childId === "grade-5-child"))
      .toHaveLength(8);
    expect(result.items.every((item) =>
      item.dueDate &&
      item.title === item.subject + " Unit Test" &&
      /^Portions: /.test(item.description ?? "")
    )).toBe(true);
    expect(result.items.some((item) =>
      item.childId === "grade-1-child" && item.subject === "Social Studies"
    )).toBe(false);
    expect(result.items.some((item) =>
      item.childId === "grade-5-child" && item.subject === "Social Studies"
    )).toBe(true);
  });});