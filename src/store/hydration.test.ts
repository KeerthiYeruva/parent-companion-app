import { describe, expect, it } from "vitest";
import type { ChildProfile, SchoolItem, UploadedDocument } from "@/types/domain";
import { buildHydratedSnapshot, hasInMemoryEntities } from "@/store/hydration";

const children: ChildProfile[] = [
  {
    id: "child-1",
    name: "Aarav",
    grade: "4",
    section: "A",
    academicYear: "2026-2027",
    colorTag: "bg-blue-500",
  },
];

const items: SchoolItem[] = [
  {
    id: "item-1",
    childId: "child-1",
    category: "Homework",
    title: "Math",
    dueDate: "2026-07-08",
    status: "Pending",
  },
];

const documents: UploadedDocument[] = [
  {
    id: "doc-1",
    title: "Planner",
    type: "ScholasticPlanner",
    childIds: ["child-1"],
    uploadedAt: "2026-07-08T00:00:00.000Z",
  },
];

describe("hydration helpers", () => {
  it("detects when in-memory entities exist", () => {
    expect(hasInMemoryEntities({ children, items: [], documents: [], selectedChildIds: [] })).toBe(true);
    expect(hasInMemoryEntities({ children: [], items, documents: [], selectedChildIds: [] })).toBe(true);
    expect(hasInMemoryEntities({ children: [], items: [], documents, selectedChildIds: [] })).toBe(true);
    expect(hasInMemoryEntities({ children: [], items: [], documents: [], selectedChildIds: [] })).toBe(false);
  });

  it("normalizes selected child ids against hydrated children", () => {
    const snapshot = buildHydratedSnapshot({
      children,
      items,
      documents,
      selectedChildIds: ["child-1", "missing"],
    });

    expect(snapshot.selectedChildIds).toEqual(["child-1"]);
  });

  it("selects all children when no saved filters exist", () => {
    const snapshot = buildHydratedSnapshot({
      children,
      items,
      documents,
      selectedChildIds: [],
    });

    expect(snapshot.selectedChildIds).toEqual(["child-1"]);
  });

  it("returns empty selection when no children are available", () => {
    const snapshot = buildHydratedSnapshot({
      children: [],
      items: [],
      documents: [],
      selectedChildIds: ["child-1"],
    });

    expect(snapshot.selectedChildIds).toEqual([]);
  });
});
