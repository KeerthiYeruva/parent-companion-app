import dayjs from "dayjs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckIcon } from "@/components/ui/check-icon";
import {
  completionButtonLabel,
  isItemCompleted,
  isItemFutureLocked,
} from "@/features/planning/services/item-completion";
import type { SchoolItem } from "@/types/domain";

const baseItem = (dueDate: string, overrides: Partial<SchoolItem> = {}): SchoolItem => ({
  id: "item-1",
  childId: "child-1",
  category: "Homework",
  title: "Mathematics Homework",
  dueDate,
  status: "Pending",
  ...overrides,
});

describe("item completion UX helpers", () => {
  const today = dayjs("2026-07-13");

  it("keeps overdue and today items enabled", () => {
    expect(isItemFutureLocked(baseItem("2026-07-12"), today)).toBe(false);
    expect(isItemFutureLocked(baseItem("2026-07-13"), today)).toBe(false);
  });

  it("locks tomorrow and future items by calendar date", () => {
    expect(isItemFutureLocked(baseItem("2026-07-14"), today)).toBe(true);
    expect(isItemFutureLocked(baseItem("2026-07-20"), today)).toBe(true);
  });

  it("keeps a future completed item visibly completed without changing data", () => {
    const item = baseItem("2026-07-14", {
      status: "Completed",
      completedAt: "2026-07-13T10:00:00.000Z",
    });

    expect(isItemCompleted(item)).toBe(true);
    expect(isItemFutureLocked(item, today)).toBe(true);
    expect(item.completedAt).toBe("2026-07-13T10:00:00.000Z");
  });

  it("uses an accessible unavailable label for future items", () => {
    expect(completionButtonLabel(baseItem("2026-07-14"), today)).toContain(
      "Available on the due date",
    );
  });

  it("renders completed state with SVG instead of a text checkmark", () => {
    const markup = renderToStaticMarkup(<CheckIcon />);

    expect(markup).toContain("<svg");
    expect(markup).not.toContain("✓");
    expect(markup).not.toContain("?");
  });
});
