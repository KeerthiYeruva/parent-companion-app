import Dexie, { type Table } from "dexie";
import type { ChildProfile, ScanRunRecord, ScanSessionFileRecord, SchoolItem, UploadedDocument } from "@/types/domain";

export interface StoredDocument {
  id: string;
  title: string;
  type: UploadedDocument["type"];
  childIds: string[];
  uploadedAt: string;
  fileName?: string;
  fileSize?: number;
  fileHash?: string;
  relativePath?: string;
  modifiedAt?: string;
  extractedMonth?: string;
}

class ParentCompanionDB extends Dexie {
  children!: Table<ChildProfile, string>;
  items!: Table<SchoolItem, string>;
  documents!: Table<StoredDocument, string>;
  scanRuns!: Table<ScanRunRecord, string>;
  scanFiles!: Table<ScanSessionFileRecord, string>;

  constructor() {
    super("parentCompanionDB");
    this.version(1).stores({
      documents: "id, type, uploadedAt",
    });

    this.version(2).stores({
      children: "id, grade, academicYear",
      items: "id, childId, category, dueDate, status, [childId+dueDate]",
      documents: "id, type, uploadedAt, fileHash, relativePath, extractedMonth",
    });

    this.version(3).stores({
      children: "id, grade, academicYear",
      items: "id, childId, category, dueDate, status, [childId+dueDate]",
      documents: "id, type, uploadedAt, fileHash, relativePath, extractedMonth",
      scanRuns: "id, scannedAt",
      scanFiles: "documentId, scanRunId, fileHash, status, scannedAt",
    });
  }
}

export const db = new ParentCompanionDB();
