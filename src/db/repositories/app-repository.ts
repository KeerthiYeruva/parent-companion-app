import { db } from "@/lib/db";
import type {
  ChildProfile,
  ImportedItemReplacementScope,
  SchoolItem,
  UploadedDocument,
} from "@/types/domain";
import type { HydrationInput } from "@/store/hydration";

export interface AppRepository {
  listChildren: () => Promise<ChildProfile[]>;
  listItems: () => Promise<SchoolItem[]>;
  listDocuments: () => Promise<UploadedDocument[]>;
  upsertChildren: (children: ChildProfile[]) => Promise<void>;
  upsertItems: (items: SchoolItem[]) => Promise<void>;
  upsertDocuments: (documents: UploadedDocument[]) => Promise<void>;
  upsertChild: (child: ChildProfile) => Promise<void>;
  upsertItem: (item: SchoolItem) => Promise<void>;
  upsertDocument: (document: UploadedDocument) => Promise<void>;
  deleteDocumentAndItems: (
    documentId: string,
    sourceDocumentIds: string[],
  ) => Promise<void>;
  replaceItemsForSourceDocuments: (
    sourceDocumentIds: string[],
    items: SchoolItem[],
    scope?: ImportedItemReplacementScope,
  ) => Promise<void>;
  replaceSnapshot: (
    snapshot: Pick<HydrationInput, "children" | "items" | "documents">,
  ) => Promise<void>;
}

const isInReplacementScope = (
  item: SchoolItem,
  scope: ImportedItemReplacementScope,
) => {
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
  deleteDocumentAndItems: async (documentId, sourceDocumentIds) => {
    await db.transaction("rw", db.documents, db.items, async () => {
      const linkedItems = await db.items
        .where("sourceDocumentId")
        .anyOf(sourceDocumentIds)
        .toArray();
      await Promise.all([
        db.documents.delete(documentId),
        linkedItems.length > 0
          ? db.items.bulkDelete(linkedItems.map((item) => item.id))
          : Promise.resolve(),
      ]);
    });
  },
  replaceSnapshot: async ({ children, items, documents }) => {
    await db.transaction(
      "rw",
      db.children,
      db.items,
      db.documents,
      async () => {
        await Promise.all([
          db.children.clear(),
          db.items.clear(),
          db.documents.clear(),
        ]);
        await Promise.all([
          children.length > 0
            ? db.children.bulkPut(children)
            : Promise.resolve(),
          items.length > 0 ? db.items.bulkPut(items) : Promise.resolve(),
          documents.length > 0
            ? db.documents.bulkPut(documents)
            : Promise.resolve(),
        ]);
      },
    );
  },
  replaceItemsForSourceDocuments: async (sourceDocumentIds, items, scope) => {
    await db.transaction("rw", db.items, async () => {
      const idsToDelete = new Set<string>();
      const bySourceDocument = await db.items
        .where("sourceDocumentId")
        .anyOf(sourceDocumentIds)
        .toArray();
      bySourceDocument.forEach((item) => idsToDelete.add(item.id));

      if (scope) {
        const scopedItems = await db.items.toArray();
        scopedItems
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
};
