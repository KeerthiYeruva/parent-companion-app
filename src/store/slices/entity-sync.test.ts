import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, SchoolItem } from "@/types/domain";

const mocks = vi.hoisted(() => ({
  upsertItem: vi.fn(async () => undefined),
  applyItemImportChanges: vi.fn(async () => undefined),
  upsertCloudItem: vi.fn(async () => undefined),
  queueCloudDelete: vi.fn(async () => undefined),
}));

vi.mock("@/db/repositories/app-repository", () => ({
  appRepository: {
    upsertItem: mocks.upsertItem,
    applyItemImportChanges: mocks.applyItemImportChanges,
  },
}));

vi.mock("@/features/sync/services/cloud-sync", () => ({
  queueCloudDelete: mocks.queueCloudDelete,
  upsertCloudItem: mocks.upsertCloudItem,
  withUpdatedAt: <T extends object>(entity: T) => ({
    ...entity,
    updatedAt: "2026-07-15T10:00:00.000Z",
  }),
}));

import { createItemsSlice } from "@/store/slices/items-slice";

const existingItem = (): SchoolItem => ({
  id: "item-1",
  childId: "child-1",
  category: "Homework",
  subject: "Mathematics",
  title: "Mathematics Homework",
  description: "Complete questions 1-10",
  dueDate: "2026-07-15",
  status: "Pending",
  sourceDocumentId: "doc-1",
  sourceDocumentIds: ["doc-1"],
  updatedAt: "2026-07-15T09:00:00.000Z",
});

const toIncoming = (item: SchoolItem) => Object.fromEntries(
  Object.entries(item).filter(
    ([key]) => !["id", "status", "completedAt", "updatedAt"].includes(key),
  ),
) as Omit<SchoolItem, "id" | "status" | "completedAt">;

const createHarness = (items: SchoolItem[]) => {
  let state = {
    items,
    pushPersistenceWarning: vi.fn(),
    queueItemSync: vi.fn(),
    clearItemSync: vi.fn(),
  } as unknown as AppState;
  const set = (update: Partial<AppState> | ((current: AppState) => Partial<AppState>)) => {
    state = { ...state, ...(typeof update === "function" ? update(state) : update) };
  };
  const get = () => state;
  state = {
    ...state,
    ...createItemsSlice(set as never, get as never, {} as never),
    items,
  };
  return () => state;
};

describe("entity-level item synchronization", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockClear());
  });

  it("completing one homework item persists and writes only that item", async () => {
    const state = createHarness([existingItem(), { ...existingItem(), id: "item-2" }]);

    state().toggleItemComplete("item-1");
    await vi.waitFor(() => expect(mocks.upsertCloudItem).toHaveBeenCalledTimes(1));

    expect(mocks.upsertItem).toHaveBeenCalledTimes(1);
    expect(mocks.upsertCloudItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "item-1", status: "Completed" }),
    );
    expect(mocks.upsertCloudItem).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "item-2" }),
    );
  });

  it("re-importing an unchanged item performs no local or cloud item rewrite", async () => {
    const current = existingItem();
    const state = createHarness([current]);

    state().replaceItemsForSourceDocuments(["doc-1"], [toIncoming(current)]);
    await vi.waitFor(() => expect(mocks.applyItemImportChanges).toHaveBeenCalled());

    expect(mocks.applyItemImportChanges).toHaveBeenCalledWith([], []);
    expect(mocks.upsertCloudItem).not.toHaveBeenCalled();
    expect(mocks.queueCloudDelete).not.toHaveBeenCalled();
    expect(state().items[0]).toBe(current);
  });

  it("an import writes only the item whose content changed", async () => {
    const unchanged = existingItem();
    const changed = { ...existingItem(), id: "item-2", title: "Old title" };
    const state = createHarness([unchanged, changed]);

    state().replaceItemsForSourceDocuments(
      ["doc-1"],
      [toIncoming(unchanged), { ...toIncoming(changed), title: "New title" }],
    );
    await vi.waitFor(() => expect(mocks.upsertCloudItem).toHaveBeenCalledTimes(1));

    expect(mocks.upsertCloudItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "item-2", title: "New title" }),
      "import",
    );
  });
});
