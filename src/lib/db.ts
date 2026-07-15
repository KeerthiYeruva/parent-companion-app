import Dexie, { type Table } from 'dexie';
import type {
  ChildProfile,
  DeletionRecord,
  ScanRunRecord,
  ScanSessionFileRecord,
  SchoolItem,
  SyncQueueRecord,
  UploadedDocument,
} from '@/types/domain';

class ParentCompanionDB extends Dexie {
  children!: Table<ChildProfile, string>;
  items!: Table<SchoolItem, string>;
  documents!: Table<UploadedDocument, string>;
  deletions!: Table<DeletionRecord, string>;
  syncQueue!: Table<SyncQueueRecord, string>;
  scanRuns!: Table<ScanRunRecord, string>;
  scanFiles!: Table<ScanSessionFileRecord, string>;

  constructor() {
    super('parentCompanionDB');
    this.version(1).stores({
      documents: 'id, type, uploadedAt',
    });

    this.version(2).stores({
      children: 'id, grade, academicYear',
      items: 'id, childId, category, dueDate, status, [childId+dueDate]',
      documents: 'id, type, uploadedAt, fileHash, relativePath, extractedMonth',
    });

    this.version(3).stores({
      children: 'id, grade, academicYear',
      items: 'id, childId, category, dueDate, status, sourceDocumentId, [childId+dueDate]',
      documents: 'id, type, uploadedAt, fileHash, relativePath, extractedMonth',
      scanRuns: 'id, scannedAt',
      scanFiles: 'documentId, scanRunId, fileHash, status, scannedAt',
    });

    this.version(4).stores({
      children: 'id, grade, academicYear',
      items: 'id, childId, category, dueDate, status, sourceDocumentId, [childId+dueDate]',
      documents: 'id, type, uploadedAt, fileHash, relativePath, extractedMonth',
      scanRuns: 'id, scannedAt',
      scanFiles: 'documentId, scanRunId, fileHash, status, scannedAt',
    });

    this.version(5).stores({
      children: 'id, grade, academicYear, updatedAt',
      items:
        'id, childId, category, dueDate, status, sourceDocumentId, updatedAt, [childId+dueDate]',
      documents: 'id, type, uploadedAt, fileHash, relativePath, extractedMonth, updatedAt',
      deletions: 'id, entityType, entityId, deletedAt, [entityType+entityId]',
      syncQueue: 'id, entityType, entityId, operation, updatedAt, [entityType+entityId]',
      scanRuns: 'id, scannedAt',
      scanFiles: 'documentId, scanRunId, fileHash, status, scannedAt',
    });
  }
}

export const db = new ParentCompanionDB();
