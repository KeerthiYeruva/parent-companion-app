import { describe, expect, it } from "vitest";
import { buildChildAliasMap, normalizeGrade } from "@/features/documents/services/child-alias-map";

describe("buildChildAliasMap", () => {
  it("normalizes detector grade hints with separators", () => {
    expect(normalizeGrade("CLASS- I")).toBe("1");
    expect(normalizeGrade("CLASS-I")).toBe("1");
    expect(normalizeGrade("GRADE_5")).toBe("5");
  });

  it("creates aliases from names and grades", () => {
    const map = buildChildAliasMap([
      {
        id: "child-1",
        name: "Aarav",
        grade: "Grade 5",
        section: "A",
        academicYear: "2026-2027",
        colorTag: "bg-blue-500",
      },
    ]);

    expect(map["aarav"]).toBe("child-1");
    expect(map["grade 5"]).toBe("child-1");
    expect(map["grade_5"]).toBe("child-1");
    expect(map["grade-5"]).toBe("child-1");
    expect(map["grade5"]).toBe("child-1");
    expect(map["class 5"]).toBe("child-1");
    expect(map["class_5"]).toBe("child-1");
    expect(map["class-5"]).toBe("child-1");
    expect(map["grade v"]).toBe("child-1");
    expect(map["class v"]).toBe("child-1");
    expect(map["5"]).toBeUndefined();
    expect(map["v"]).toBeUndefined();
    expect(map["grade 5 section a"]).toBe("child-1");
    expect(map["class v sec a"]).toBe("child-1");
  });

  it("does not assign unmatched document grades to the only child profile", () => {
    const map = buildChildAliasMap([
      {
        id: "child-1",
        name: "Ruthvish",
        grade: "1",
        section: "A",
        academicYear: "2026-2027",
        colorTag: "bg-blue-500",
      },
    ]);

    expect(map["class i"]).toBe("child-1");
    expect(map["grade 1"]).toBe("child-1");
    expect(map["class iii"]).toBeUndefined();
    expect(map["grade 3"]).toBeUndefined();
    expect(map["class v"]).toBeUndefined();
    expect(map["grade 5"]).toBeUndefined();
  });

  it("does not create broad grade aliases when multiple children share a grade", () => {
    const map = buildChildAliasMap([
      {
        id: "child-1",
        name: "Aarav",
        grade: "1",
        section: "A",
        academicYear: "2026-2027",
        colorTag: "bg-blue-500",
      },
      {
        id: "child-2",
        name: "Mira",
        grade: "Grade 1",
        section: "B",
        academicYear: "2026-2027",
        colorTag: "bg-emerald-500",
      },
    ]);

    expect(map["aarav"]).toBe("child-1");
    expect(map["mira"]).toBe("child-2");
    expect(map["grade 1"]).toBeUndefined();
    expect(map["1"]).toBeUndefined();
    expect(map["grade 1 section a"]).toBe("child-1");
    expect(map["class i sec b"]).toBe("child-2");
  });

  it("normalizes roman grade values from child profiles", () => {
    const map = buildChildAliasMap([
      {
        id: "child-5",
        name: "Myra",
        grade: "V",
        section: "B",
        academicYear: "2026-2027",
        colorTag: "bg-emerald-500",
      },
    ]);

    expect(map["grade 5"]).toBe("child-5");
    expect(map["grade v"]).toBe("child-5");
    expect(map["class 5 section b"]).toBe("child-5");
    expect(map["class v sec b"]).toBe("child-5");
  });
});
