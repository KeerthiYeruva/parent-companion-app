import { describe, expect, it } from "vitest";
import { buildChildAliasMap } from "@/features/documents/services/child-alias-map";

describe("buildChildAliasMap", () => {
  it("creates aliases from names and grades", () => {
    const map = buildChildAliasMap([
      {
        id: "child-1",
        name: "Aarav",
        grade: "5",
        section: "A",
        academicYear: "2026-2027",
        colorTag: "bg-blue-500",
      },
    ]);

    expect(map["aarav"]).toBe("child-1");
    expect(map["grade 5"]).toBe("child-1");
    expect(map["grade5"]).toBe("child-1");
    expect(map["class 5"]).toBe("child-1");
    expect(map["5"]).toBe("child-1");
  });
});
