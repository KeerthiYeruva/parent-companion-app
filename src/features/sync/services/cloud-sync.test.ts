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

vi.mock("@/lib/firebase", () => ({
  firestore: undefined,
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
});
