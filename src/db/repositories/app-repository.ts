import { db } from "@/lib/db";
import type { ChildProfile, SchoolItem, UploadedDocument } from "@/types/domain";

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
}

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
};
