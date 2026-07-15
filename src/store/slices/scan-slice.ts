import type { StateCreator } from 'zustand';
import { scanRepository } from '@/db/repositories/scan-repository';
import type { AppState, ScanRunRecord, ScanSessionFileRecord } from '@/types/domain';

type ScanSlice = Pick<
  AppState,
  | 'connectedFolderName'
  | 'lastScanAt'
  | 'scanQueue'
  | 'scanHistory'
  | 'setConnectedFolderName'
  | 'setScanQueue'
  | 'updateScanFile'
  | 'hydrateScanFile'
  | 'clearScanQueue'
  | 'hydrateScanHistory'
>;

const countByStatus = (files: ScanSessionFileRecord[], status: ScanSessionFileRecord['status']) => {
  return files.filter((file) => file.status === status).length;
};

export const createScanSlice: StateCreator<AppState, [], [], ScanSlice> = (set, get) => ({
  connectedFolderName: undefined,
  lastScanAt: undefined,
  scanQueue: [],
  scanHistory: [],
  setConnectedFolderName: (folderName: string) => {
    set({ connectedFolderName: folderName });
  },
  setScanQueue: (files: ScanSessionFileRecord[], scannedAt: string) => {
    const scanRunId = files[0]?.scanRunId ?? `scan-run-${crypto.randomUUID()}`;
    const run: ScanRunRecord = {
      id: scanRunId,
      scannedAt,
      fileCount: files.length,
      newCount: countByStatus(files, 'ready'),
      changedCount: countByStatus(files, 'changed'),
      duplicateCount: countByStatus(files, 'duplicate'),
      reviewCount: countByStatus(files, 'needsReview') + countByStatus(files, 'partiallyReady'),
    };

    scanRepository.saveScanRun(run, files).catch(() => {
      get().pushPersistenceWarning('Scan history could not be saved to local database.');
    });

    set((state) => ({
      lastScanAt: scannedAt,
      scanQueue: files,
      scanHistory: [run, ...state.scanHistory.filter((entry) => entry.id !== run.id)],
    }));
  },
  updateScanFile: (documentId, updater) => {
    set((state) => ({
      scanQueue: state.scanQueue.map((file) =>
        file.documentId === documentId ? updater(file) : file
      ),
    }));
  },
  hydrateScanFile: async (documentId: string) => {
    try {
      const persistedFile = await scanRepository.getScanFileByDocumentId(documentId);
      if (!persistedFile) {
        return undefined;
      }

      set((state) => ({
        scanQueue: state.scanQueue.some((file) => file.documentId === documentId)
          ? state.scanQueue.map((file) => (file.documentId === documentId ? persistedFile : file))
          : [persistedFile, ...state.scanQueue],
      }));

      return persistedFile;
    } catch {
      get().pushPersistenceWarning('Scanned file details could not be loaded from local database.');
      return undefined;
    }
  },
  clearScanQueue: () => {
    set({ scanQueue: [] });
  },
  hydrateScanHistory: async () => {
    try {
      const scanHistory = await scanRepository.listScanRuns();
      set({ scanHistory });
    } catch {
      get().pushPersistenceWarning('Scan history could not be loaded from local database.');
    }
  },
});
