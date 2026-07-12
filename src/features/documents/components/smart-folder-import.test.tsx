import { describe, expect, it } from "vitest";
import type { RawImportRecord } from "@/features/import";
import { attachUnitTestDatesFromSchedule } from "@/features/documents/components/smart-folder-import";

const subjects = [
  ["Computer Science", "2026-07-17"],
  ["Mathematics", "2026-07-20"],
  ["Hindi", "2026-07-21"],
  ["Science", "2026-07-22"],
  ["Kannada", "2026-07-23"],
  ["Social Studies", "2026-07-24"],
  ["English", "2026-07-27"],
  ["General knowledge", "2026-07-28"],
] as const;

const schedules = (childName: string, includeSocialStudies: boolean) =>
  subjects
    .filter(([subject]) => includeSocialStudies || subject !== "Social Studies")
    .map<RawImportRecord>(([subject, dueDate]) => ({
      childName,
      category: "UnitTest",
      subject,
      title: subject + " Unit Test",
      dueDate,
    }));

describe("July Unit Test fixture merge", () => {
  it("keeps the Grade 1 seven-subject and Grade 5 eight-subject timetables separate", () => {
    const shared = [
      ...schedules("Ruthvish Reddy Annapareddy", true),
      ...schedules("Luhas", true),
    ];
    const grade1Schedule = schedules("Ruthvish Reddy Annapareddy", false);
    const grade5Schedule = schedules("Luhas", true);
    const grade1Portions = grade1Schedule.map<RawImportRecord>((row) => ({
      ...row,
      dueDate: undefined,
      title: "Unit Test Portion: " + row.subject,
      description: row.subject + " fixture portion",
      parserIssue: "Unit test portion found without an exam schedule date",
    }));

    const merged = attachUnitTestDatesFromSchedule([
      { rows: shared, isGradeSpecificSchedule: false },
      { rows: grade1Schedule, isGradeSpecificSchedule: true },
      { rows: grade5Schedule, isGradeSpecificSchedule: true },
      { rows: grade1Portions, isGradeSpecificSchedule: false },
    ]).flat();

    const grade1 = merged.filter(
      (row) => row.childName === "Ruthvish Reddy Annapareddy",
    );
    const grade5 = merged.filter((row) => row.childName === "Luhas");

    expect(grade1).toHaveLength(7);
    expect(grade1.every((row) => row.dueDate && !row.parserIssue)).toBe(true);
    expect(grade1.some((row) => row.subject === "Social Studies")).toBe(false);
    expect(grade5).toHaveLength(8);
    expect(grade5).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "Social Studies",
          dueDate: "2026-07-24",
        }),
      ]),
    );
  });

  it("matches portion rows to schedule rows when subject casing differs", () => {
    const scheduleRow = {
      childName: "Luhas",
      category: "UnitTest" as const,
      subject: "General knowledge",
      title: "General knowledge Unit Test",
      dueDate: "2026-07-28",
    };
    const portionRow = {
      ...scheduleRow,
      dueDate: undefined,
      subject: "general knowledge",
      title: "Unit Test Portion: general knowledge",
      description: "general knowledge fixture portion",
      parserIssue: "Unit test portion found without an exam schedule date",
    };

    const merged = attachUnitTestDatesFromSchedule([
      { rows: [scheduleRow], isGradeSpecificSchedule: true },
      { rows: [portionRow], isGradeSpecificSchedule: false },
    ]).flat();

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(
      expect.objectContaining({
        subject: "general knowledge",
        dueDate: "2026-07-28",
        parserIssue: undefined,
      }),
    );
  });
});