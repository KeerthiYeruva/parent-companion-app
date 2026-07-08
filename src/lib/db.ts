import Dexie, { type Table } from "dexie";
import type { UploadedDocument } from "@/types/domain";

export interface StoredDocument {
  id: string;
  title: string;
  type: UploadedDocument["type"];
  childIds: string[];
  uploadedAt: string;
  fileName?: string;
  fileSize?: number;
}

class ParentCompanionDB extends Dexie {
  documents!: Table<StoredDocument, string>;

  constructor() {
    super("parentCompanionDB");
    this.version(1).stores({
      documents: "id, type, uploadedAt",
    });
  }
}

export const db = new ParentCompanionDB();
