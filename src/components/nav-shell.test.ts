import { describe, expect, it } from "vitest";
import { isActiveLink, primaryNavLinks } from "@/components/nav-shell";

describe("primary navigation", () => {
  it("shows only Overview, Tests, and More", () => {
    expect(primaryNavLinks.map((link) => link.label)).toEqual([
      "Overview",
      "Tests",
      "More",
    ]);
    expect(primaryNavLinks.map((link) => link.label)).not.toContain("Kids");
  });

  it("marks overview active for day, week, and month routes", () => {
    expect(isActiveLink("/day", "/")).toBe(true);
    expect(isActiveLink("/week", "/")).toBe(true);
    expect(isActiveLink("/month", "/")).toBe(true);
  });

  it("marks More active for child, document, scan, and backup routes", () => {
    expect(isActiveLink("/kids", "/more")).toBe(true);
    expect(isActiveLink("/kids/child-1/tests", "/more")).toBe(true);
    expect(isActiveLink("/documents", "/more")).toBe(true);
    expect(isActiveLink("/scan/review", "/more")).toBe(true);
    expect(isActiveLink("/backup", "/more")).toBe(true);
  });
});
