import { describe, expect, it } from "vitest";
import { morePageLinks } from "@/features/planning/components/more-view";

describe("More page links", () => {
  it("links to Manage Kids, School Files, and Data & Backup", () => {
    expect(morePageLinks).toEqual([
      {
        href: "/more/profiles",
        title: "Manage Kids",
        description: "Add or update child profiles",
      },
      {
        href: "/documents",
        title: "School Files",
        description: "Upload, scan, review, and manage school documents",
      },
      {
        href: "/backup",
        title: "Data & Backup",
        description: "Export, import, and manage planner data",
      },
    ]);
  });
});
