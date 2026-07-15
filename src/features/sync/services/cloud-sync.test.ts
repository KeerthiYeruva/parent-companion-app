import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ChildProfile,
  DeletionRecord,
  SchoolItem,
  SyncQueueRecord,
  UploadedDocument,
} from "@/types/domain";

const store = vi.hoisted(() => ({
  children: [] as ChildProfile[],
  items: [] as SchoolItem[],
  documents: [] as UploadedDocument[],
  deletions: [] as DeletionRecord[],
  syncQueue: [] as SyncQueueRecord[],
}));

const cloud = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  failingIds: new Set<string>(),
}));

const firestoreMocks = vi.hoisted(() => ({
  getDoc: vi.fn(async (reference: { id: string }) => ({
    exists: () => cloud.documents.has(reference.id),
    data: () => cloud.documents.get(reference.id),
  })),
  setDoc: vi.fn(async (reference: { id: string }, payload: Record<string, unknown>) => {
    if (cloud.failingIds.has(reference.id)) throw new Error("write failed");
    cloud.documents.set(reference.id, payload);
  }),
  deleteDoc: vi.fn(async (reference: { id: string }) => {
    if (cloud.failingIds.has(reference.id)) throw new Error("delete failed");
    cloud.documents.delete(reference.id);
  }),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((...parts: string[]) => ({ id: parts.at(-1), parts })),
  doc: vi.fn((...parts: string[]) => ({ id: parts.at(-1), parts })),
  getDoc: firestoreMocks.getDoc,
  getDocs: vi.fn(),
  setDoc: firestoreMocks.setDoc,
  deleteDoc: firestoreMocks.deleteDoc,
  onSnapshot: vi.fn(() => vi.fn()),
  writeBatch: vi.fn(() => ({ set: vi.fn(), commit: vi.fn() })),
}));

vi.mock("@/lib/firebase", () => ({
  firestore: {},
}));

vi.mock("@/db/repositories/app-repository", () => ({
  appRepository: {
    listChildren: vi.fn(async () => store.children),
    listItems: vi.fn(async () => store.items),
    listDocuments: vi.fn(async () => store.documents),
    listDeletions: vi.fn(async () => store.deletions),
    listSyncQueue: vi.fn(async () => store.syncQueue),
    upsertChildren: vi.fn(async (children: ChildProfile[]) => {
      store.children = children;
    }),
    upsertItems: vi.fn(async (items: SchoolItem[]) => {
      store.items = items;
    }),
    upsertDocuments: vi.fn(async (documents: UploadedDocument[]) => {
      store.documents = documents;
    }),
    upsertDeletion: vi.fn(async (deletion: DeletionRecord) => {
      store.deletions = [
        ...store.deletions.filter((entry) => entry.id !== deletion.id),
        deletion,
      ];
    }),
    upsertSyncQueueRecord: vi.fn(async (record: SyncQueueRecord) => {
      store.syncQueue = [
        ...store.syncQueue.filter((entry) => entry.id !== record.id),
        record,
      ];
    }),
    deleteSyncQueueRecord: vi.fn(async (id: string) => {
      store.syncQueue = store.syncQueue.filter((entry) => entry.id !== id);
    }),
  },
}));

import {
  mergeCloudSnapshot,
  queueCloudDelete,
  queueCloudUpsert,
  retryQueuedCloudOperations,
  withUpdatedAt,
} from "@/features/sync/services/cloud-sync";

const child = (id: string, updatedAt?: string): ChildProfile => ({
  id,
  name: id,
  grade: "1",
  section: "A",
  academicYear: "2026-2027",
  colorTag: "bg-blue-500",
  updatedAt,
});

const item = (id: string, updatedAt?: string): SchoolItem => ({
  id,
  childId: "child-1",
  category: "Homework",
  title: id,
  dueDate: "2026-07-13",
  status: "Pending",
  updatedAt,
});

const documentRecord = (id: string, updatedAt?: string): UploadedDocument => ({
  id,
  title: id,
  type: "ScholasticPlanner",
  childIds: ["child-1"],
  uploadedAt: "2026-07-01T00:00:00.000Z",
  updatedAt,
});

describe("cloud sync merge helpers", () => {
  beforeEach(() => {
    store.children = [];
    store.items = [];
    store.documents = [];
    store.deletions = [];
    store.syncQueue = [];
    cloud.documents.clear();
    cloud.failingIds.clear();
    firestoreMocks.getDoc.mockClear();
    firestoreMocks.setDoc.mockClear();
    firestoreMocks.deleteDoc.mockClear();
  });

  it("downloads cloud-only entities without clearing unrelated local data", async () => {
    store.items = [item("local-only", "2026-07-13T09:00:00.000Z")];

    const result = await mergeCloudSnapshot({
      children: [child("cloud-child", "2026-07-13T10:00:00.000Z")],
      items: [item("cloud-only", "2026-07-13T10:00:00.000Z")],
      documents: [documentRecord("cloud-doc", "2026-07-13T10:00:00.000Z")],
      deletions: [],
    });

    expect(result.items.map((entry) => entry.id).sort()).toEqual([
      "cloud-only",
      "local-only",
    ]);
    expect(result.children).toHaveLength(1);
    expect(result.documents).toHaveLength(1);
  });

  it("keeps newer local versions over older cloud versions", async () => {
    store.items = [item("item-1", "2026-07-13T11:00:00.000Z")];

    const result = await mergeCloudSnapshot({
      children: [],
      items: [item("item-1", "2026-07-13T10:00:00.000Z")],
      documents: [],
      deletions: [],
    });

    expect(result.items[0].updatedAt).toBe("2026-07-13T11:00:00.000Z");
  });

  it("keeps newer cloud versions over older local versions", async () => {
    store.items = [item("item-1", "2026-07-13T09:00:00.000Z")];

    const result = await mergeCloudSnapshot({
      children: [],
      items: [item("item-1", "2026-07-13T10:00:00.000Z")],
      documents: [],
      deletions: [],
    });

    expect(result.items[0].updatedAt).toBe("2026-07-13T10:00:00.000Z");
  });

  it("treats legacy records without updatedAt as older but preserves them when cloud is empty", async () => {
    store.items = [item("legacy")];

    const result = await mergeCloudSnapshot({
      children: [],
      items: [],
      documents: [],
      deletions: [],
    });

    expect(result.items).toEqual([expect.objectContaining({ id: "legacy" })]);
  });

  it("applies tombstones and prevents stale entity recreation", async () => {
    store.items = [item("deleted-item", "2026-07-13T09:00:00.000Z")];

    const result = await mergeCloudSnapshot({
      children: [],
      items: [item("deleted-item", "2026-07-13T09:30:00.000Z")],
      documents: [],
      deletions: [
        {
          id: "item:deleted-item",
          entityType: "item",
          entityId: "deleted-item",
          deletedAt: "2026-07-13T10:00:00.000Z",
        },
      ],
    });

    expect(result.items).toEqual([]);
  });

  it("newer queued update supersedes older queued update for the same entity", async () => {
    cloud.failingIds.add("item-1");
    await expect(queueCloudUpsert("item", withUpdatedAt(item("item-1"), "2026-07-13T09:00:00.000Z"))).rejects.toThrow();
    await expect(queueCloudUpsert("item", withUpdatedAt(item("item-1"), "2026-07-13T10:00:00.000Z"))).rejects.toThrow();

    expect(store.syncQueue).toHaveLength(1);
    expect(store.syncQueue[0]).toEqual(
      expect.objectContaining({
        entityType: "item",
        entityId: "item-1",
        operation: "upsert",
        updatedAt: "2026-07-13T10:00:00.000Z",
      }),
    );
  });

  it("delete supersedes a pending upsert", async () => {
    cloud.failingIds.add("doc-1");
    await expect(queueCloudUpsert("document", documentRecord("doc-1", "2026-07-13T09:00:00.000Z"))).rejects.toThrow();
    await expect(queueCloudDelete("document", "doc-1", ["doc-1", "hash-1"])).rejects.toThrow();

    expect(store.syncQueue).toHaveLength(1);
    expect(store.syncQueue[0]).toEqual(
      expect.objectContaining({
        entityType: "document",
        entityId: "doc-1",
        operation: "delete",
        sourceDocumentIds: ["doc-1", "hash-1"],
      }),
    );
    expect(store.deletions).toEqual([
      expect.objectContaining({
        entityType: "document",
        entityId: "doc-1",
      }),
    ]);
  });

  it("startup and repeated lifecycle retries write nothing when the queue is empty", async () => {
    await retryQueuedCloudOperations();
    await retryQueuedCloudOperations();
    await retryQueuedCloudOperations();

    expect(firestoreMocks.getDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.deleteDoc).not.toHaveBeenCalled();
  });

  it.each([
    ["item", item("item-1", "2026-07-13T10:00:00.000Z")],
    ["child", child("child-1", "2026-07-13T10:00:00.000Z")],
    ["document", documentRecord("doc-1", "2026-07-13T10:00:00.000Z")],
  ] as const)("writes only one changed %s entity", async (entityType, entity) => {
    await queueCloudUpsert(entityType, entity);

    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.setDoc.mock.calls[0][0]).toEqual(
      expect.objectContaining({ id: entity.id }),
    );
    expect(store.syncQueue).toEqual([]);
  });

  it("does not write an unchanged entity again", async () => {
    const changedItem = item("item-1", "2026-07-13T10:00:00.000Z");

    await queueCloudUpsert("item", changedItem);
    await queueCloudUpsert("item", changedItem);

    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
    expect(store.syncQueue).toEqual([]);
  });

  it("applying a remote listener snapshot locally does not enqueue or write it back", async () => {
    await mergeCloudSnapshot({
      children: [child("cloud-child", "2026-07-13T10:00:00.000Z")],
      items: [item("cloud-item", "2026-07-13T10:00:00.000Z")],
      documents: [documentRecord("cloud-doc", "2026-07-13T10:00:00.000Z")],
      deletions: [],
    });

    expect(store.syncQueue).toEqual([]);
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it("keeps only failed operations queued and a later retry removes only its success", async () => {
    cloud.failingIds.add("item-failed");
    await expect(queueCloudUpsert("item", item("item-failed", "2026-07-13T10:00:00.000Z"))).rejects.toThrow();
    cloud.failingIds.add("item-success");
    await expect(queueCloudUpsert("item", item("item-success", "2026-07-13T10:00:00.000Z"))).rejects.toThrow();

    cloud.failingIds.delete("item-success");
    const result = await retryQueuedCloudOperations();

    expect(result).toEqual({ attempted: 2, synced: 1 });
    expect(store.syncQueue).toEqual([
      expect.objectContaining({ entityId: "item-failed", attempts: 2 }),
    ]);
    expect(firestoreMocks.setDoc.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ id: "item-success" }),
    );
  });
});
