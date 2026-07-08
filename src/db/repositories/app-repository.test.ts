import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  childrenToArray: vi.fn(),
  itemsToArray: vi.fn(),
  documentsToArray: vi.fn(),
  childrenBulkPut: vi.fn(),
  itemsBulkPut: vi.fn(),
  documentsBulkPut: vi.fn(),
  childrenPut: vi.fn(),
  itemsPut: vi.fn(),
  documentsPut: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    children: {
      toArray: mocks.childrenToArray,
      bulkPut: mocks.childrenBulkPut,
      put: mocks.childrenPut,
    },
    items: {
      toArray: mocks.itemsToArray,
      bulkPut: mocks.itemsBulkPut,
      put: mocks.itemsPut,
    },
    documents: {
      toArray: mocks.documentsToArray,
      bulkPut: mocks.documentsBulkPut,
      put: mocks.documentsPut,
    },
  },
}));

import { appRepository } from "@/db/repositories/app-repository";

describe("appRepository", () => {
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
});
