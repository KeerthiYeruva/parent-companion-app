import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  childrenToArray: vi.fn(),
  itemsToArray: vi.fn(),
  documentsToArray: vi.fn(),
  childrenBulkPut: vi.fn(),
  itemsBulkPut: vi.fn(),
  documentsBulkPut: vi.fn(),
  childrenPut: vi.fn(),
  childrenDelete: vi.fn(),
  itemsPut: vi.fn(),
  itemsBulkDelete: vi.fn(),
  itemsWhere: vi.fn(),
  itemsAnyOf: vi.fn(),
  itemsAnyOfToArray: vi.fn(),
  documentsPut: vi.fn(),
  documentsBulkDelete: vi.fn(),
  transaction: vi.fn(async (_mode: string, ...args: unknown[]) => {
    const callback = args.at(-1) as () => Promise<void>;
    return callback();
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    children: {
      toArray: mocks.childrenToArray,
      bulkPut: mocks.childrenBulkPut,
      put: mocks.childrenPut,
      delete: mocks.childrenDelete,
    },
    items: {
      toArray: mocks.itemsToArray,
      bulkPut: mocks.itemsBulkPut,
      bulkDelete: mocks.itemsBulkDelete,
      put: mocks.itemsPut,
      where: mocks.itemsWhere,
    },
    documents: {
      toArray: mocks.documentsToArray,
      bulkPut: mocks.documentsBulkPut,
      put: mocks.documentsPut,
      bulkDelete: mocks.documentsBulkDelete,
    },
    transaction: mocks.transaction,
  },
}));

import { appRepository } from "@/db/repositories/app-repository";

describe("appRepository", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it("delegates list operations to db tables", async () => {
    mocks.childrenToArray.mockResolvedValueOnce([{ id: "child-1" }]);
    mocks.itemsToArray.mockResolvedValueOnce([{ id: "item-1" }]);
    mocks.documentsToArray.mockResolvedValueOnce([{ id: "doc-1" }]);

    await expect(appRepository.listChildren()).resolves.toEqual([{ id: "child-1" }]);
    await expect(appRepository.listItems()).resolves.toEqual([{ id: "item-1" }]);
    await expect(appRepository.listDocuments()).resolves.toEqual([{ id: "doc-1" }]);
  });

  it("delegates upsert operations to db tables", async () => {
    const child = { id: "child-1" };
    const item = { id: "item-1" };
    const doc = { id: "doc-1" };

    await appRepository.upsertChild(child as never);
    await appRepository.upsertItem(item as never);
    await appRepository.upsertDocument(doc as never);
    await appRepository.upsertChildren([child] as never);
    await appRepository.upsertItems([item] as never);
    await appRepository.upsertDocuments([doc] as never);

    expect(mocks.childrenPut).toHaveBeenCalledWith(child);
    expect(mocks.itemsPut).toHaveBeenCalledWith(item);
    expect(mocks.documentsPut).toHaveBeenCalledWith(doc);
    expect(mocks.childrenBulkPut).toHaveBeenCalledWith([child]);
    expect(mocks.itemsBulkPut).toHaveBeenCalledWith([item]);
    expect(mocks.documentsBulkPut).toHaveBeenCalledWith([doc]);
  });

  it("replaces items for matching source documents", async () => {
    const item = { id: "item-new", sourceDocumentId: "doc-1" };
    const oldItem = { id: "item-old", sourceDocumentId: "doc-1" };
    mocks.itemsToArray.mockResolvedValueOnce([oldItem]);

    await appRepository.replaceItemsForSourceDocuments(["doc-1", "doc-2"], [item] as never);

    expect(mocks.transaction).toHaveBeenCalledWith("rw", expect.anything(), expect.any(Function));
    expect(mocks.itemsBulkDelete).toHaveBeenCalledWith(["item-old"]);
    expect(mocks.itemsBulkPut).toHaveBeenCalledWith([item]);
  });

  it("also replaces stale imported items in the selected rebuild scope", async () => {
    const item = { id: "item-new", childId: "child-1", category: "UnitTest", dueDate: "2026-07-17" };
    const scopedOldItem = { id: "item-old-scope", sourceDocumentId: "old-doc", childId: "child-1", category: "UnitTest", dueDate: "2026-07-17" };
    const manualItem = { id: "item-manual", childId: "child-1", category: "UnitTest", dueDate: "2026-07-17" };
    mocks.itemsToArray.mockResolvedValueOnce([scopedOldItem, manualItem]);

    await appRepository.replaceItemsForSourceDocuments(["doc-1"], [item] as never, {
      childIds: ["child-1"],
      categories: ["UnitTest"],
      fromDate: "2026-07-17",
      toDate: "2026-07-28",
    });

    expect(mocks.itemsBulkDelete).toHaveBeenCalledWith(["item-old-scope"]);
    expect(mocks.itemsBulkPut).toHaveBeenCalledWith([item]);
  });

  it("does not delete items outside the replacement scope", async () => {
    const replacementItem = { id: "item-new", childId: "child-1", category: "UnitTest", dueDate: "2026-07-17" };
    const outOfScopeItem = { id: "item-outside", childId: "child-1", category: "UnitTest", dueDate: "2026-07-30" };
    mocks.itemsToArray.mockResolvedValueOnce([outOfScopeItem]);

    await appRepository.replaceItemsForSourceDocuments(["doc-1"], [replacementItem] as never, {
      childIds: ["child-1"],
      categories: ["UnitTest"],
      fromDate: "2026-07-17",
      toDate: "2026-07-28",
    });

    expect(mocks.itemsBulkDelete).not.toHaveBeenCalled();
    expect(mocks.itemsBulkPut).toHaveBeenCalledWith([replacementItem]);
  });

  it("persists only changed import items and deletes only stale IDs", async () => {
    const changedItem = { id: "item-changed" };

    await appRepository.applyItemImportChanges([changedItem] as never, ["item-stale"]);

    expect(mocks.itemsBulkPut).toHaveBeenCalledWith([changedItem]);
    expect(mocks.itemsBulkDelete).toHaveBeenCalledWith(["item-stale"]);
  });

  it("deletes a child with linked items and updates shared documents", async () => {
    const updatedDocument = {
      id: "doc-shared",
      childIds: ["child-2"],
    };

    await appRepository.deleteChildAndLinkedData(
      "child-1",
      ["item-1", "item-2"],
      ["doc-child-only"],
      [updatedDocument] as never,
    );

    expect(mocks.childrenDelete).toHaveBeenCalledWith("child-1");
    expect(mocks.itemsBulkDelete).toHaveBeenCalledWith(["item-1", "item-2"]);
    expect(mocks.documentsBulkDelete).toHaveBeenCalledWith(["doc-child-only"]);
    expect(mocks.documentsBulkPut).toHaveBeenCalledWith([updatedDocument]);
  });
});
