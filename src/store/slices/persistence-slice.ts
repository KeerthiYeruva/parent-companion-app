import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import { upsertCloudItem } from "@/features/import/services/cloud-sync";
import { buildHydratedSnapshot } from "@/store/hydration";
import type { AppState } from "@/types/domain";

type PersistenceSlice = Pick<
  AppState,
  | "persistenceWarnings"
  | "pendingItemSyncIds"
  | "pushPersistenceWarning"
  | "clearPersistenceWarnings"
  | "queueItemSync"
  | "clearItemSync"
  | "retryPendingItemSync"
  | "importBackupData"
>;

export const createPersistenceSlice: StateCreator<
  AppState,
  [],
  [],
  PersistenceSlice
> = (set, get) => ({
  persistenceWarnings: [],
  pendingItemSyncIds: [],

  pushPersistenceWarning: (message: string) => {
    set((state) => {
      if (state.persistenceWarnings.includes(message)) {
        return state;
      }

      return {
        persistenceWarnings: [
          ...state.persistenceWarnings,
          message,
        ],
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
    }));
  },

  clearItemSync: (itemId: string) => {
    set((state) => ({
      pendingItemSyncIds: state.pendingItemSyncIds.filter(
        (id) => id !== itemId,
      ),
    }));
  },

  retryPendingItemSync: async () => {
    const pendingIds = get().pendingItemSyncIds;

    if (pendingIds.length === 0) {
      return;
    }

    const localItems = await appRepository.listItems();

    const itemsToSync = localItems.filter((item) =>
      pendingIds.includes(item.id),
    );

    const syncedIds: string[] = [];

    for (const item of itemsToSync) {
      try {
        await upsertCloudItem(item);
        syncedIds.push(item.id);
      } catch {
        // Keep failed item IDs in the queue.
      }
    }

    set((state) => ({
      pendingItemSyncIds: state.pendingItemSyncIds.filter(
        (id) => !syncedIds.includes(id),
      ),
    }));

    if (syncedIds.length === itemsToSync.length) {
      get().clearPersistenceWarnings();
    } else {
      get().pushPersistenceWarning(
        "Some item changes still could not be synced to cloud.",
      );
    }
  },

  importBackupData: async (backup) => {
    const snapshot = buildHydratedSnapshot(backup);

    await appRepository.replaceSnapshot(snapshot);

    set(snapshot);
  },
});