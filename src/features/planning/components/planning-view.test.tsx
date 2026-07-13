import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TomorrowTestAlert } from "./planning-view";
import type { SchoolItem } from "@/types/domain";

const testItem = (overrides: Partial<SchoolItem>): SchoolItem => ({
  id: "test-1",
  childId: "child-1",
  category: "ClassTest",
  title: "Class Test Chapter 2 Listening Skills",
  subject: "Science",
  dueDate: "2026-07-14",
  status: "Pending",
  ...overrides,
});

describe("TomorrowTestAlert", () => {
  it("renders one compact amber reminder without completion controls", () => {
    const markup = renderToStaticMarkup(
      <TomorrowTestAlert items={[testItem({})]} />,
    );

    expect(markup).toContain("planner-tomorrow-test-alert");
    expect(markup).toContain("border-amber-200");
    expect(markup).toContain("Test Tomorrow");
    expect(markup).toContain("Science - Class Test - Chapter 2 - Listening Skills");
    expect(markup).not.toContain("planner-item__checkbox");
  });

  it("renders plural count and limits long reminder lists", () => {
    const markup = renderToStaticMarkup(
      <TomorrowTestAlert
        items={[
          testItem({ id: "test-1", subject: "Science" }),
          testItem({ id: "test-2", subject: "Hindi" }),
          testItem({ id: "test-3", subject: "Mathematics" }),
          testItem({ id: "test-4", subject: "English" }),
        ]}
      />,
    );

    expect(markup).toContain("4 Tests Tomorrow");
    expect(markup).toContain("+1 more");
  });
});
