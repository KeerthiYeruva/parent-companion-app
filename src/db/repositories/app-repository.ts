import { db } from '@/lib/db';
import type {
  ChildProfile,
  DeletionRecord,
  ImportedItemReplacementScope,
  SchoolItem,
  SyncQueueRecord,
  UploadedDocument,
} from '@/types/domain';
import type { HydrationInput } from '@/store/hydration';

export interface AppRepository {
  listChildren: () => Promise<ChildProfile[]>;
  listItems: () => Promise<SchoolItem[]>;
  listDocuments: () => Promise<UploadedDocument[]>;
  listDeletions: () => Promise<DeletionRecord[]>;
  listSyncQueue: () => Promise<SyncQueueRecord[]>;
  upsertChildren: (children: ChildProfile[]) => Promise<void>;
  upsertItems: (items: SchoolItem[]) => Promise<void>;
  upsertDocuments: (documents: UploadedDocument[]) => Promise<void>;
  upsertChild: (child: ChildProfile) => Promise<void>;
  upsertItem: (item: SchoolItem) => Promise<void>;
  upsertDocument: (document: UploadedDocument) => Promise<void>;
  upsertDeletion: (deletion: DeletionRecord) => Promise<void>;
  upsertSyncQueueRecord: (record: SyncQueueRecord) => Promise<void>;
  deleteSyncQueueRecord: (id: string) => Promise<void>;
  deleteDocumentAndItems: (documentId: string, sourceDocumentIds: string[]) => Promise<void>;
  deleteChildAndLinkedData: (
    childId: string,
    linkedItemIds: string[],
    documentIdsToDelete: string[],
    documentsToUpdate: UploadedDocument[]
  ) => Promise<void>;
  replaceItemsForSourceDocuments: (
    sourceDocumentIds: string[],
    items: SchoolItem[],
    scope?: ImportedItemReplacementScope
  ) => Promise<void>;
  applyItemImportChanges: (upserts: SchoolItem[], deletedItemIds: string[]) => Promise<void>;
  replaceSnapshot: (
    snapshot: Pick<HydrationInput, 'children' | 'items' | 'documents'>
  ) => Promise<void>;
}

const isInReplacementScope = (item: SchoolItem, scope: ImportedItemReplacementScope) => {
  return (
    Boolean(item.sourceDocumentId) &&
    scope.childIds.includes(item.childId) &&
    scope.categories.includes(item.category) &&
    item.dueDate >= scope.fromDate &&
    item.dueDate <= scope.toDate
  );
};

export const appRepository: AppRepository = {
  listChildren: () => db.children.toArray(),
  listItems: () => db.items.toArray(),
  listDocuments: async () => {
    const docs = await db.documents.toArray();
    return docs;
  },
  listDeletions: () => db.deletions.toArray(),
  listSyncQueue: () => db.syncQueue.toArray(),
  upsertChildren: async (children) => {
    await db.children.bulkPut(children);
  },
  upsertItems: async (items) => {
    await db.items.bulkPut(items);
  },
  upsertDocuments: async (documents) => {
    await db.documents.bulkPut(documents);
  },
  upsertChild: async (child) => {
    await db.children.put(child);
  },
  upsertItem: async (item) => {
    await db.items.put(item);
  },
  upsertDocument: async (document) => {
    await db.documents.put(document);
  },
  upsertDeletion: async (deletion) => {
    await db.deletions.put(deletion);
  },
  upsertSyncQueueRecord: async (record) => {
    await db.syncQueue.put(record);
  },
  deleteSyncQueueRecord: async (id) => {
    await db.syncQueue.delete(id);
  },
  deleteDocumentAndItems: async (documentId, sourceDocumentIds) => {
    await db.transaction('rw', db.documents, db.items, async () => {
      const allItems = await db.items.toArray();
      const linkedItems = allItems.filter(
        (item) =>
          (item.sourceDocumentId && sourceDocumentIds.includes(item.sourceDocumentId)) ||
          (item.sourceDocumentIds ?? []).some((sourceDocumentId) =>
            sourceDocumentIds.includes(sourceDocumentId)
          )
      );
      await Promise.all([
        db.documents.delete(documentId),
        linkedItems.length > 0
          ? db.items.bulkDelete(linkedItems.map((item) => item.id))
          : Promise.resolve(),
      ]);
    });
  },
  deleteChildAndLinkedData: async (
    childId,
    linkedItemIds,
    documentIdsToDelete,
    documentsToUpdate
  ) => {
    await db.transaction('rw', db.children, db.items, db.documents, async () => {
      await Promise.all([
        db.children.delete(childId),
        linkedItemIds.length > 0 ? db.items.bulkDelete(linkedItemIds) : Promise.resolve(),
        documentIdsToDelete.length > 0
          ? db.documents.bulkDelete(documentIdsToDelete)
          : Promise.resolve(),
        documentsToUpdate.length > 0 ? db.documents.bulkPut(documentsToUpdate) : Promise.resolve(),
      ]);
    });
  },
  replaceSnapshot: async ({ children, items, documents }) => {
    await db.transaction('rw', db.children, db.items, db.documents, async () => {
      await Promise.all([
        children.length > 0 ? db.children.bulkPut(children) : Promise.resolve(),
        items.length > 0 ? db.items.bulkPut(items) : Promise.resolve(),
        documents.length > 0 ? db.documents.bulkPut(documents) : Promise.resolve(),
      ]);
    });
  },
  replaceItemsForSourceDocuments: async (sourceDocumentIds, items, scope) => {
    await db.transaction('rw', db.items, async () => {
      const idsToDelete = new Set<string>();
      const existingItems = await db.items.toArray();
      existingItems
        .filter(
          (item) =>
            (item.sourceDocumentId && sourceDocumentIds.includes(item.sourceDocumentId)) ||
            (item.sourceDocumentIds ?? []).some((sourceDocumentId) =>
              sourceDocumentIds.includes(sourceDocumentId)
            )
        )
        .forEach((item) => idsToDelete.add(item.id));

      if (scope) {
        existingItems
          .filter((item) => isInReplacementScope(item, scope))
          .forEach((item) => idsToDelete.add(item.id));
      }

      if (idsToDelete.size > 0) {
        await db.items.bulkDelete(Array.from(idsToDelete));
      }

      if (items.length > 0) {
        await db.items.bulkPut(items);
      }
    });
  },
  applyItemImportChanges: async (upserts, deletedItemIds) => {
    await db.transaction('rw', db.items, async () => {
      if (deletedItemIds.length > 0) {
        await db.items.bulkDelete(deletedItemIds);
      }
      if (upserts.length > 0) {
        await db.items.bulkPut(upserts);
      }
    });
  },
};
