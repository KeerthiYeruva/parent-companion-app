import { db } from '@/lib/db';
import type { ScanRunRecord, ScanSessionFileRecord } from '@/types/domain';

export interface ScanRepository {
  saveScanRun: (run: ScanRunRecord, files: ScanSessionFileRecord[]) => Promise<void>;
  listScanRuns: () => Promise<ScanRunRecord[]>;
  listScanFilesByRun: (scanRunId: string) => Promise<ScanSessionFileRecord[]>;
  getScanFileByDocumentId: (documentId: string) => Promise<ScanSessionFileRecord | undefined>;
}

export const scanRepository: ScanRepository = {
  saveScanRun: async (run, files) => {
    await db.transaction('rw', db.scanRuns, db.scanFiles, async () => {
      await db.scanRuns.put(run);
      await db.scanFiles.bulkPut(files);
    });
  },
  listScanRuns: async () => {
    const runs = await db.scanRuns.toArray();
    return runs.sort((left, right) => right.scannedAt.localeCompare(left.scannedAt));
  },
  listScanFilesByRun: async (scanRunId) => {
    return db.scanFiles.where('scanRunId').equals(scanRunId).toArray();
  },
  getScanFileByDocumentId: async (documentId) => {
    return db.scanFiles.get(documentId);
  },
};
