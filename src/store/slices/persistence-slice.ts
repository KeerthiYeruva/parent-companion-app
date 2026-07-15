import type { StateCreator } from 'zustand';
import { appRepository } from '@/db/repositories/app-repository';
import {
  retryQueuedCloudOperations,
  uploadLocalDataToCloud,
} from '@/features/sync/services/cloud-sync';
import { buildHydratedSnapshot } from '@/store/hydration';
import type { AppState } from '@/types/domain';

type PersistenceSlice = Pick<
  AppState,
  | 'persistenceWarnings'
  | 'pendingItemSyncIds'
  | 'syncStatus'
  | 'pendingSyncCount'
  | 'pushPersistenceWarning'
  | 'clearPersistenceWarnings'
  | 'queueItemSync'
  | 'clearItemSync'
  | 'retryPendingItemSync'
  | 'refreshSyncState'
  | 'importBackupData'
>;

export const createPersistenceSlice: StateCreator<AppState, [], [], PersistenceSlice> = (
  set,
  get
) => ({
  persistenceWarnings: [],
  pendingItemSyncIds: [],
  syncStatus: 'signedOut',
  pendingSyncCount: 0,

  pushPersistenceWarning: (message: string) => {
    set((state) => {
      if (state.persistenceWarnings.includes(message)) {
        return state;
      }

      return {
        persistenceWarnings: [...state.persistenceWarnings, message],
      };
    });
  },

  clearPersistenceWarnings: () => {
    set({ persistenceWarnings: [] });
  },

  queueItemSync: (itemId: string) => {
    set((state) => ({
      pendingItemSyncIds: state.pendingItemSyncIds.includes(itemId)
        ? state.pendingItemSyncIds
        : [...state.pendingItemSyncIds, itemId],
      pendingSyncCount: Math.max(
        state.pendingSyncCount,
        state.pendingItemSyncIds.includes(itemId)
          ? state.pendingItemSyncIds.length
          : state.pendingItemSyncIds.length + 1
      ),
      syncStatus:
        typeof navigator !== 'undefined' && navigator.onLine
          ? get().syncStatus === 'signedOut'
            ? 'signedOut'
            : 'error'
          : 'offline',
    }));
  },

  clearItemSync: (itemId: string) => {
    set((state) => ({
      pendingItemSyncIds: state.pendingItemSyncIds.filter((id) => id !== itemId),
    }));
  },

  retryPendingItemSync: async () => {
    const queued = await appRepository.listSyncQueue();
    if (queued.length === 0) {
      set({
        pendingItemSyncIds: [],
        pendingSyncCount: 0,
        syncStatus:
          get().syncStatus === 'signedOut'
            ? 'signedOut'
            : typeof navigator !== 'undefined' && navigator.onLine
              ? 'synced'
              : 'offline',
      });
      return;
    }

    set({
      syncStatus:
        get().syncStatus === 'signedOut'
          ? 'signedOut'
          : typeof navigator !== 'undefined' && navigator.onLine
            ? 'syncing'
            : 'offline',
    });
    const result = await retryQueuedCloudOperations();
    const remaining = await appRepository.listSyncQueue();
    set({
      pendingItemSyncIds: remaining
        .filter((record) => record.entityType === 'item')
        .map((record) => record.entityId),
      pendingSyncCount: remaining.length,
      syncStatus:
        get().syncStatus === 'signedOut'
          ? 'signedOut'
          : remaining.length === 0
            ? typeof navigator !== 'undefined' && navigator.onLine
              ? 'synced'
              : 'offline'
            : 'error',
    });

    if (remaining.length === 0) {
      get().clearPersistenceWarnings();
    } else {
      get().pushPersistenceWarning(
        `${remaining.length} change${remaining.length === 1 ? '' : 's'} still could not be synced to cloud.`
      );
    }

    void result;
  },

  refreshSyncState: async () => {
    const queued = await appRepository.listSyncQueue();
    set({
      pendingItemSyncIds: queued
        .filter((record) => record.entityType === 'item')
        .map((record) => record.entityId),
      pendingSyncCount: queued.length,
      syncStatus:
        get().syncStatus === 'signedOut'
          ? 'signedOut'
          : queued.length > 0
            ? typeof navigator !== 'undefined' && navigator.onLine
              ? 'error'
              : 'offline'
            : typeof navigator !== 'undefined' && navigator.onLine
              ? 'synced'
              : 'offline',
    });
  },

  importBackupData: async (backup) => {
    const snapshot = buildHydratedSnapshot(backup);

    await appRepository.replaceSnapshot(snapshot);
    await uploadLocalDataToCloud().catch(() => {
      get().pushPersistenceWarning('Backup data could not be synced to cloud.');
    });

    set(snapshot);
  },
});
